import { Socket } from "node:net";
import { encodeBinary as encodeVONPacket, decodeBinary as decodeVONPacket } from "~/proto/generated/messages/vast/VONPacket.js";
import { AcknowledgeMessage, Addr, HelloMessage, HelloResponseMessage, Identity, VONPacket, WelcomeMessage } from "~/proto/generated/messages/vast/index.js";
import { Vec2d, vec2dFromProtobuf, vec2dToProtobuf } from "~/spatial/types.js";
import { VONNeighbor, VONNode, deduplicateNeighbors, excludeNeighbors, identityToVONNeighbor } from "./node.js";
import EventEmitter from "node:events";

export type MessageTypes = NonNullable<VONPacket['message']>['field']

export class VONConnection extends EventEmitter {
    #conn: Socket;

    // Receive state machine
    #recv_state: 'header' | 'message' = 'header';
    #recv_chunks: Uint8Array[] = [];
    #recv_message_length: number = 0;
    
    // sequence number for messages
    #sequence: bigint = BigInt(0);

    constructor(conn: Socket, public node: VONNode, public addr?: Addr) {
        super();
        this.#conn = conn;

        this.#conn.on('data', data => {
            this.#recv_chunks.push(new Uint8Array(data.buffer));

            const chunk_total_length = this.#recv_chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
            const joined_chunks = new Uint8Array(chunk_total_length);
            let current_offset = 0;
            for (const chunk of this.#recv_chunks) {
                joined_chunks.set(chunk, current_offset);
                current_offset += chunk.byteLength;
            }

            const view = new DataView(joined_chunks.buffer);
            let viewOffset = 0;

            while (viewOffset < joined_chunks.byteLength) {
                if (this.#recv_state === 'header') {

                    if (joined_chunks.byteLength < 4) {
                        // Not enough data to read the header
                        break;
                    }
    
                    this.#recv_message_length = view.getUint32(viewOffset);
                    
                    // drop the header
                    this.#recv_chunks = [joined_chunks.slice(4)];
    
                    viewOffset += 4;
                    this.#recv_state = 'message';
    
                    this.#log('VON: incoming message length', this.#recv_message_length);
                }
    
                // read the message
                if (joined_chunks.byteLength >= this.#recv_message_length) {
                    // read this.#recv_message_length bytes from the buffer
                    const message = joined_chunks.slice(viewOffset, viewOffset + this.#recv_message_length);
                    this.#receive(message);
                    this.#recv_state = 'header';
                    // reset the state
                    this.#recv_state = 'header';
                    // move the view offset
                    viewOffset += this.#recv_message_length;
                } else {
                    // not enough data to read the message
                    break;
                }
            }

            this.#recv_chunks = [joined_chunks.slice(viewOffset)];
        })
    }

    on(event: 'hello-response', listener: (res: HelloResponseMessage) => unknown): this;
    on(event: 'hello-reject', listener: (res: AcknowledgeMessage) => unknown): this;
    on(event: 'acknowledge', listener: (res: AcknowledgeMessage) => unknown): this;
    on(...args: Parameters<EventEmitter['on']>) {
        return super.on(...args);
    }

    #receive(data: Uint8Array) {
        const packet = decodeVONPacket(data);
        this.#log(`VON: received message`, packet);


        if (!packet.message) {
            // invalid packet - ignore
            this.#log('VON: received packet without message, ignoring');
            return;
        }

        switch (packet.message.field) {
            case 'join':
                this.#handleJoin(packet.sequence, packet.message.value);
                break;
            case 'acknowledge':
                this.emit('acknowledge', packet.message.value);
                this.#log(`acknowledge(sequence=${packet.sequence})`)
                break;
            case 'welcome':
                this.#handleWelcome(packet.sequence, packet.message.value);
                break;
            case 'helloReject':
                this.emit('hello-reject', packet.message.value);
                this.#log(`hello-reject(sequence=${packet.sequence})`);
                break;
            case 'helloResponse':
                this.emit('hello-response', packet.message.value);
                this.#log(`hello-response(sequence=${packet.sequence})`);
                break;
            case 'hello':
                this.#handleHello(packet.sequence, packet.message.value);
                break;
            default:
                this.#log(`VON: received unknown message type`, packet.message.field, packet.message.value);
                break;
        }
    }

    #indentify(addr: Addr) {
        if (this.node.hasConnection(addr)) {
            // this connection is illegal. there's already a connection with this address
            // close the connection
            throw new Error('Connection already exists. Unimplemented behavior.')
        }
        this.addr = addr;
    }

    async #handleJoin(seq: string, message: Identity) {
        this.#log(`VON: received join message`, message);
        if (!message.addr || !message.pos) {
            // invalid message
            this.#log('VON: invalid join message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        this.#indentify(message.addr);

        // The *gateway node* acknowledges the *joining node*'s request by sending a *JOIN RESPONSE message* to the *joining node*.
        await this.#acknowledge(seq);

        // The *gateway node* uses the *point forwarding algorithm* to send a *JOIN QUERY message* to the node whose region contains the *joining node*'s requested position. This node is the *acceptor node*.

        // we first send the query to ourselves
        // from there the query will be forwarded to the correct node
        await this.#handleJoinQuery(seq, message, true);
    }

    #acknowledge(seq: string) {
        return this.#send({
            field: 'acknowledge',
            value: {
                sequence: seq
            }
        })
    }

    #throwIfUnidentified() {
        if (!this.addr) {
            throw new Error('Connection is not identified');
        }
    }

    async #handleWelcome(seq: string, message: WelcomeMessage) {
        this.#throwIfUnidentified();

        if (!message.identity || (!message.identity.addr || !message.identity.pos)) {
            // invalid message
            this.#log('VON: invalid welcome message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        // The *joining node* acknowledges the *WELCOME message* by sending a *ACKNOWLEDGE message* to the *acceptor node*.
        await this.#acknowledge(seq);

        // The *joining node* creates an set of *EN nodes* from the list of neighboring nodes in the *WELCOME message*.
        const joinContactedSet = new Set<string>(); // reset the set
        // this set stores all nodes already contacted to find the neighbors
        // we should not contact them again

        // we're already connected to the acceptor node through this connection
        joinContactedSet.add(this.addr?.hostname + ':' + this.addr?.port);

        const acceptorNode = identityToVONNeighbor(message.identity);

        // Using the *EN node set*, the *joining node* creates a *local Voronoi diagram*.
        this.node.addMultipleNodes([
            acceptorNode,
            ...message.neighbors.map(n => identityToVONNeighbor(n))
        ]);

        await this.#joinFindNeighbors(acceptorNode, joinContactedSet);
    }

    async #joinFindNeighbors(acceptorNode: VONNeighbor, joinContactedSet: Set<string>) {
        // TODO: this could be sped up by sending multiple queries at once!
        this.#log(`VON: finding neighbors for join`);

        // Identify the true *EN neighbors* from the constructed *local Voronoi diagram*.
        const neighbors = this.node.getNeighbors();
        neighbors.push(acceptorNode);

        const uncontacted = neighbors.filter(n => !joinContactedSet.has(n.addr.hostname + ':' + n.addr.port));

        // The *joining node* enters a loop:
        while (uncontacted.length > 0) {
            // Send a *HELLO message* to each of the *EN neighbors* that has not yet been contacted.
            const neighbor = uncontacted.pop();
            if (!neighbor) {
                break;
            }

            joinContactedSet.add(neighbor.addr.hostname + ':' + neighbor.addr.port);

            const conn = await this.node.getConnection(neighbor.addr);

            // Wait for a *HELLO RESPONSE message* from each of the *EN neighbors*.
            const res = await conn.#hello();

            // If it receives a *HELLO REJECT message* from any of the *EN neighbors*, that neighbor is removed from the *EN node set* and discarded in the rest of the below calculations.
            if (
                (res.field === 'helloReject') || 
                !res.value.identity || !res.value.identity.addr || !res.value.identity.pos
            ) {
                // we ignore the node
                // TODO: we need to signal that this node is not used anymore and to be disconnected
                continue;
            }

            neighbors.push(identityToVONNeighbor(res.value.identity));

            // TODO: at this point we should check if the identities match or update the position if they don't

            // The *HELLO RESPONSE message* contains the *missing EN neighbors* of the *joining node*. Add them to the *EN node set*.
            const missingNodeIds = res.value.missingNeighbors.filter(n => n.addr);
            const truelyMissing = missingNodeIds.filter(n => !joinContactedSet.has(n.addr!.hostname + ':' + n.addr!.port));
            uncontacted.push(...truelyMissing.map(n => identityToVONNeighbor(n)));
        }
        // If the *EN node set* has not changed, exit the loop. (no uncontacted nodes)
        // The *joining node* determines its final *EN neighbors* from the constructed *local Voronoi diagram*. 
        // It closes any connections to the *EN nodes* in the set that are not its *EN neighbors*.
        const newNeighborhood = deduplicateNeighbors(neighbors);
        this.node.clearNeighbors();
        this.node.addMultipleNodes(newNeighborhood);

        this.#log(`VON: join complete`, this.node.getNeighbors().map(n => n.addr));
    }

    async #hello() {
        const sequence = await this.#send({
            field: 'hello',
            value: {
                identity: this.node.getIdentity(),
                neighbors: this.node.getNeighbors().map(n => n.addr)
            }
        });

        const result = await new Promise<{
            field: 'helloResponse',
            value: HelloResponseMessage
        } | {
            field: 'helloReject',
            value: AcknowledgeMessage
        }>((resolve, reject) => {
            const handleHelloResponse = (res: HelloResponseMessage) => {
                if (res.sequence === sequence) {
                    this.off('hello-response', handleHelloResponse);
                    this.off('hello-reject', handleHelloReject);
                    resolve({
                        field: 'helloResponse',
                        value: res
                    });
                }
            }
            this.on('hello-response', handleHelloResponse);

            const handleHelloReject = (res: AcknowledgeMessage) => {
                if (res.sequence === sequence) {
                    this.off('hello-reject', handleHelloReject);
                    this.off('hello-response', handleHelloResponse);
                    resolve({
                        field: 'helloReject',
                        value: res
                    })
                }
            }
            this.on('hello-reject', handleHelloReject);
        })

        return result;
    }

    async #handleHello(seq: string, message: HelloMessage) {
        if (!message.identity || !message.identity.addr || !message.identity.pos) {
            // invalid message
            this.#log('VON: invalid hello message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }
        // The *node* runs the *add node algorithm*. 
        const {
            newExpectedNeighbors,
            isEnclosing
        } = this.node.addNode(identityToVONNeighbor(message.identity));

        // If the *joining node* is not one of the *EN neighbors*, the join request is invalid and the *node* sends a *HELLO REJECT message* to the *joining node*. The procedure ends here in this case.
        if (!isEnclosing) {
            await this.#helloReject(seq);
            return;
        }

        // The *node* sends a *HELLO RESPONSE message* to the *joining node* containing the *missing EN neighbors* of the *joining node*.
        const missingNeighbors = excludeNeighbors(newExpectedNeighbors, message.neighbors);

        await this.#helloResponse(seq, missingNeighbors);
    }

    #helloReject(seq: string) {
        return this.#send({
            field: 'helloReject',
            value: {
                sequence: seq
            }
        })
    }

    #helloResponse(seq: string, missingNeighbors: VONNeighbor[]) {
        return this.#send({
            field: 'helloResponse',
            value: {
                sequence: seq,
                identity: this.node.getIdentity(),
                missingNeighbors
            }
        })
    }

    async #handleJoinQuery(seq: string, message: Identity, isThisConnection = false) {
        if (!message.addr || !message.pos) {
            // invalid message
            this.#log('VON: invalid join query message', message);
            if (!isThisConnection) 
                this.#sendInvalidResponse(seq, 'malformed fields');
            
            return;
        }

        const position = vec2dFromProtobuf(message.pos);

        const nextNode = this.node.pointForward(position);

        if (typeof nextNode === 'boolean') {
            // this is the target node
            this.#log(`VON: join query accepted`)
            // run the join logic

            // The *acceptor node* runs the *add node algorithm*.
            // The *acceptor node* determines the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
            const {
                newExpectedNeighbors: enList
            } = this.node.addNode({
                addr: message.addr,
                position: position,
                aoiRadius: message.aoiRadius,
                conn: isThisConnection ? this : undefined
            });

            const conn = await this.node.getConnection(message.addr);

            // The *acceptor node* sends a *WELCOME message* to the *joining node* containing the estimated list of the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
            await conn.#send({
                field: 'welcome',
                value: {
                    neighbors: enList,
                    identity: this.node.getIdentity()
                }
            });
        }
    }

    #sendInvalidResponse(sequence: string, reason: string) {
        this.#send({
            field: 'invalid',
            value: {
                sequence,
                reason
            }
        })
    }

    join() {
        const message: Identity = this.node.getIdentity();
        this.#log(`VON: joining network as`, message);

        this.#send({
            field: 'join',
            value: message
        });
    }

    #pack(message: NonNullable<VONPacket['message']>) {
        const content: VONPacket = {
            timestamp: Date.now().toString(),
            sequence: this.#sequence.toString(),
            message
        }

        this.#sequence++; // increment the sequence number

        const encoded = encodeVONPacket(content);

        // the packet is the length of the message followed by the message itself
        const packet = new Uint8Array(encoded.byteLength + 4);
        const view = new DataView(packet.buffer);

        view.setUint32(0, encoded.byteLength);
        packet.set(encoded, 4);

        return {
            packet,
            sequence: content.sequence
        };
    }

    #send(message: NonNullable<VONPacket['message']>) {
        const {
            packet,
            sequence
        } = this.#pack(message);

        this.#log(`VON: sending message`, message.field);

        return new Promise<string>((resolve, reject) => {
            this.#conn.write(packet, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(sequence);
                }
            })
        });
    }

    #log(...args: unknown[]) {
        console.log(`[${this.node.id} -> ${this.addr ? `${this.addr?.hostname}:${this.addr?.port}`: 'unidentified'}]`, ...args);
    }
}