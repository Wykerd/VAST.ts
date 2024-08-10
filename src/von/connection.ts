import { Socket } from "node:net";
import { encodeBinary as encodeVONPacket, decodeBinary as decodeVONPacket } from "~/proto/generated/messages/vast/VONPacket.js";
import { AcknowledgeMessage, Addr, HelloMessage, HelloResponseMessage, Identity, LeaveMessage, LeaveNotifyMessage, LeaveRecoverMessage, MoveResponseMessage, NeighborhoodMessage, VONPacket, WelcomeMessage } from "~/proto/generated/messages/vast/index.js";
import { vec2dFromProtobuf } from "~/spatial/types.js";
import { VONNode } from "./node.js";
import { VONNeighbor, deduplicateNeighbors, excludeNeighbors, filterOutNeighbor, identityToVONNeighbor, indexOfNeighbor, vonNeighborToIdentity } from "./neighbor.js";
import EventEmitter from "node:events";
import winston from "winston";
import { stringify } from "~/utils.js";

export type MessageTypes = NonNullable<VONPacket['message']>['field']

export class VONConnection extends EventEmitter {
    #conn: Socket;
    #logger?: winston.Logger;

    // Receive state machine
    #recvState: 'header' | 'message' = 'header';
    #recvChunks: Uint8Array[] = [];
    #recvMessageLength: number = 0;
    
    // sequence number for messages
    #sequence: bigint = BigInt(0);

    constructor(conn: Socket, public node: VONNode, public addr?: Addr, logger?: winston.Logger) {
        super();
        this.#logger = logger;
        this.#conn = conn;

        this.#conn.setKeepAlive(true);

        this.#conn.on('data', this.#handleTCPData.bind(this));
        this.#conn.on('close', this.#handleTCPClose.bind(this));
    }

    #handleTCPClose(didError: boolean) {
        this.#log('VON: connection closed', didError);
    }

    #handleTCPData(data: Buffer) {
        this.#recvChunks.push(new Uint8Array(data.buffer));

        const chunkTotalLength = this.#recvChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
        const joinedChunks = new Uint8Array(chunkTotalLength);
        let currentOffset = 0;
        for (const chunk of this.#recvChunks) {
            joinedChunks.set(chunk, currentOffset);
            currentOffset += chunk.byteLength;
        }

        const view = new DataView(joinedChunks.buffer);
        let viewOffset = 0;

        while (viewOffset < joinedChunks.byteLength) {
            if (this.#recvState === 'header') {

                if (joinedChunks.byteLength < 4) {
                    // Not enough data to read the header
                    break;
                }

                this.#recvMessageLength = view.getUint32(viewOffset);
                
                // drop the header
                this.#recvChunks = [joinedChunks.slice(4)];

                viewOffset += 4;
                this.#recvState = 'message';

                this.#log('VON: incoming message length', this.#recvMessageLength);
            }

            // read the message
            if (joinedChunks.byteLength >= this.#recvMessageLength) {
                // read this.#recv_message_length bytes from the buffer
                const message = joinedChunks.slice(viewOffset, viewOffset + this.#recvMessageLength);
                this.#receive(message);
                this.#recvState = 'header';
                // reset the state
                this.#recvState = 'header';
                // move the view offset
                viewOffset += this.#recvMessageLength;
            } else {
                // not enough data to read the message
                break;
            }
        }

        this.#recvChunks = [joinedChunks.slice(viewOffset)];
    }

    on(event: 'hello-response', listener: (res: HelloResponseMessage) => unknown): this;
    on(event: 'hello-reject', listener: (res: AcknowledgeMessage) => unknown): this;
    on(event: 'acknowledge', listener: (res: AcknowledgeMessage) => unknown): this;
    on(event: 'move-response', listener: (res: MoveResponseMessage) => unknown): this;
    on(event: 'leave-recover', listener: (res: LeaveRecoverMessage) => unknown): this;
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
            case 'joinQuery':
                this.#handleJoinQuery(packet.sequence, packet.message.value);
                break;
            case 'moveResponse':
                this.emit('move-response', packet.message.value);
                break;
            case 'move':
                this.#handleMove(packet.sequence, packet.message.value);
                break;
            case 'leave':
                this.#handleLeave(packet.sequence, packet.message.value);
                break;
            case 'leaveNotify':
                this.#handleLeaveNotify(packet.sequence, packet.message.value);
                break;
            case 'leaveRecover':
                this.emit('leave-recover', packet.message.value);
                break;
            case 'neighborhood':
                this.#handleNeighborhood(packet.sequence, packet.message.value);
                break;
            default:
                this.#log(`VON: received unknown message type`, packet.message.field, packet.message.value);
                break;
        }
    }

    #identify(addr: Addr) {
        if (this.addr) {
            if (this.addr.hostname !== addr.hostname && this.addr.port !== addr.port)
                throw new Error(`Connection already identified as ${this.addr.hostname}:${this.addr.port}. Cannot change to ${addr.hostname}:${addr.port}`)
            else
                return; // identify did not change.
        }
        if (this.node.hasConnection(addr)) {
            // this connection is illegal. there's already a connection with this address
            // close the connection
            throw new Error('Connection already exists. Unimplemented behavior.')
        }
        this.addr = addr;
    }

    async #handleNeighborhood(seq: string, message: NeighborhoodMessage) {
        if (!message.identity || !message.identity.addr || !message.identity.pos) {
            // invalid message
            this.#log('VON: invalid neighborhood message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        this.#identify(message.identity.addr);

        await this.#acknowledge(seq);

        const neighbors = this.node.getNeighbors();

        if (indexOfNeighbor(neighbors, message.identity.addr) === -1) {
            // the node is not a neighbor, invalid
            this.#log('VON: invalid neighborhood message', message);
            this.#sendInvalidResponse(seq, 'not a neighbor');
            return;
        }

        const sender = identityToVONNeighbor(message.identity);

        const currentNeighbors = this.node.getNeighborNeighbors(sender);

        const noLongerTwoHop = excludeNeighbors(currentNeighbors, message.neighbors.map(n => n.addr!));

        this.node.forgetNeighbors(noLongerTwoHop);

        const neighborsToAdd = excludeNeighbors(
            deduplicateNeighbors([
                ...message.neighbors.map(n => identityToVONNeighbor(n))
            ]),
            [
                this.node.addr,
                // TODO: replace with getNeighborhood() or something (include the second hop neighbors)
                ...this.node.getNeighbors().map(n => n.addr)
            ]
        );

        this.node.addMultipleNodes(neighborsToAdd);
    }

    async #handleLeave(seq: string, message: LeaveMessage) {
        if (!message.identity || !message.identity.addr || !message.identity.pos) {
            // invalid message
            this.#log('VON: invalid leave message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }
        await this.node.removeNode(identityToVONNeighbor(message.identity), message.neighbors.map(n => identityToVONNeighbor(n)));
        await this.#syncNeighborhood(identityToVONNeighbor(message.identity));
    }

    async #handleLeaveNotify(seq: string, message: LeaveNotifyMessage) {
        if (!message.leavingNode || !message.leavingNode.addr || !message.leavingNode.pos) {
            // invalid message
            this.#log('VON: invalid leave notify message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        if (!message.identity || !message.identity.addr || !message.identity.pos) {
            // invalid message
            this.#log('VON: invalid leave notify message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        const leaving = identityToVONNeighbor(message.leavingNode);

        // 1. The *notifyable neighbor* runs the *remove node algorithm*.
        await this.node.removeNode(leaving);

        // 2. The *notifyable neighbor* responds with a *LEAVE RECOVER message* containing the *potential EN neighbors* of the *notifying node*.
        const connectedNodeNeighbors = this.node.getNeighborNeighbors(identityToVONNeighbor(message.identity));

        await this.#send({
            field: 'leaveRecover',
            value: {
                sequence: seq,
                potentialNeighbors: connectedNodeNeighbors.map(n => vonNeighborToIdentity(n)),
                oneHopNeighbors: this.node.getNeighbors().map(n => vonNeighborToIdentity(n))
            }
        });
    }

    async #handleJoin(seq: string, message: Identity) {
        this.#log(`VON: received join message`, message);
        if (!message.addr || !message.pos) {
            // invalid message
            this.#log('VON: invalid join message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        this.#identify(message.addr);

        // The *gateway node* acknowledges the *joining node*'s request by sending a *JOIN RESPONSE message* to the *joining node*.
        await this.#acknowledge(seq);

        // The *gateway node* uses the *point forwarding algorithm* to send a *JOIN QUERY message* to the node whose region contains the *joining node*'s requested position. This node is the *acceptor node*.

        // we first send the query to ourselves
        // from there the query will be forwarded to the correct node
        await this.#handleJoinQuery(seq, message, true);
    }

    async #handleMove(seq: string, message: Identity) {
        if (!message.addr || !message.pos) {
            // invalid message
            this.#log('VON: invalid move message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        this.#identify(message.addr);

        // The recipient nodes run the *move node algorithm* apon receiving the message.
        const potentialNeighbors = this.node.moveNeighbor(identityToVONNeighbor(message));

        const seq_res = await this.#send({
            field: 'moveResponse',
            value: {
                sequence: seq,
                neighbors: potentialNeighbors.map(n => vonNeighborToIdentity(n)),
                oneHopNeighbors: this.node.getNeighbors().map(n => vonNeighborToIdentity(n))
            }
        })

        await this.#waitForAck(seq_res);

        const contactingNode = identityToVONNeighbor(message);

        await this.#syncNeighborhood(contactingNode);
    }

    #acknowledge(seq: string) {
        return this.#send({
            field: 'acknowledge',
            value: {
                sequence: seq
            }
        })
    }

    async #handleWelcome(seq: string, message: WelcomeMessage) {
        if (!message.identity || (!message.identity.addr || !message.identity.pos)) {
            // invalid message
            this.#log('VON: invalid welcome message', message);
            this.#sendInvalidResponse(seq, 'malformed fields');
            return;
        }

        this.#identify(message.identity.addr);

        // The *joining node* acknowledges the *WELCOME message* by sending a *ACKNOWLEDGE message* to the *acceptor node*.
        await this.#acknowledge(seq);

        // The *joining node* creates an set of *EN nodes* from the list of neighboring nodes in the *WELCOME message*.
        const joinContactedSet = new Set<string>(); // reset the set
        // this set stores all nodes already contacted to find the neighbors
        // we should not contact them again

        // we're already connected to the acceptor node through this connection
        joinContactedSet.add(this.addr?.hostname + ':' + this.addr?.port);

        const acceptorNode = identityToVONNeighbor(message.identity);

        const nodesToAdd = deduplicateNeighbors([
            acceptorNode,
            ...message.neighbors.map(n => identityToVONNeighbor(n)),
            ...message.oneHopNeighbors.map(n => identityToVONNeighbor(n))
        ]);

        // Using the *EN node set*, the *joining node* creates a *local Voronoi diagram*.
        this.node.addMultipleNodes(filterOutNeighbor(nodesToAdd, this.node.addr));

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
            neighbors.push(...res.value.oneHopNeighbors.map(n => identityToVONNeighbor(n)));

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
        this.node.addMultipleNodes(filterOutNeighbor(newNeighborhood, this.node.addr));

        this.#log(`VON: join complete`, this.node.getNeighbors().map(n => n.addr));

        // notify listeners that the node has joined
        this.node.emit('joined');
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
        const joiningNode = identityToVONNeighbor(message.identity);
        const {
            newExpectedNeighbors,
            isEnclosing
        } = this.node.addNode(joiningNode);

        // If the *joining node* is not one of the *EN neighbors*, the join request is invalid and the *node* sends a *HELLO REJECT message* to the *joining node*. The procedure ends here in this case.
        if (!isEnclosing) {
            await this.#helloReject(seq);
            return;
        }

        // The *node* sends a *HELLO RESPONSE message* to the *joining node* containing the *missing EN neighbors* of the *joining node*.
        const missingNeighbors = excludeNeighbors(newExpectedNeighbors, message.neighbors);

        await this.#helloResponse(seq, missingNeighbors);

        await this.#syncNeighborhood(joiningNode);
    }

    async #syncNeighborhood(changeNode: VONNeighbor) {
        const neighbors = filterOutNeighbor(this.node.getNeighbors(), changeNode.addr);

        for (const neighbor of neighbors) {
            // we need to notify our neighbors that we have a new neighbor
            // so that they can update their second hop neighbors
            const conn = await this.node.getConnection(neighbor.addr);
            await conn.neighborhood();
        }
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
                missingNeighbors: missingNeighbors.map(n => vonNeighborToIdentity(n)),
                oneHopNeighbors: this.node.getNeighbors().map(n => vonNeighborToIdentity(n))
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

        if (!isThisConnection) {
            this.#acknowledge(seq);
        }

        const position = vec2dFromProtobuf(message.pos);

        const nextNode = this.node.pointForward(position);

        if (typeof nextNode === 'boolean') {
            // this is the target node
            this.#log(`VON: join query accepted`)
            // run the join logic

            // The *acceptor node* runs the *add node algorithm*.
            // The *acceptor node* determines the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
            const joiningNode: VONNeighbor = {
                addr: message.addr,
                position: position,
                aoiRadius: message.aoiRadius,
                conn: isThisConnection ? this : undefined
            }

            const {
                newExpectedNeighbors: enList
            } = this.node.addNode(joiningNode);

            const conn = await this.node.getConnection(message.addr);

            // The *acceptor node* sends a *WELCOME message* to the *joining node* containing the estimated list of the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
            await conn.#send({
                field: 'welcome',
                value: {
                    neighbors: enList.map(en => vonNeighborToIdentity(en)),
                    oneHopNeighbors: this.node.getNeighbors().map(n => vonNeighborToIdentity(n)),
                    identity: this.node.getIdentity()
                }
            });

            await this.#syncNeighborhood(joiningNode);

            return;
        }

        // we're not the target node
        // forward the query
        this.#log(`VON: forwarding join query to`, nextNode.addr);
        const conn = await this.node.getConnection(nextNode.addr);

        await conn.#joinQuery(message);
    }

    async neighborhood() {
        const seq = await this.#send({
            field: 'neighborhood',
            value: {
                identity: this.node.getIdentity(),
                neighbors: this.node.getNeighbors().map(n => vonNeighborToIdentity(n))
            }
        });

        return this.#waitForAck(seq);
    }

    #waitForAck(seq: string) {
        return new Promise<void>((resolve, reject) => {
            const handler = (res: AcknowledgeMessage) => {
                if (res.sequence === seq) {
                    resolve();
                    this.off('acknowledge', handler);
                }
            };

            this.on('acknowledge', handler);
        });
    }

    #joinQuery(message: Identity) {
        return this.#send({
            field: 'joinQuery',
            value: message
        });
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

    /**
     * Send a JOIN message to the node.
     * 
     * This is the first step in joining the network.
     * 
     * @returns A promise that resolves when the node has been successfully joined.
     */
    async join() {
        const message = this.node.getIdentity();
        this.#log(`VON: joining network as`, message);

        await this.#send({
            field: 'join',
            value: message
        });

        await new Promise<void>((resolve, reject) => {
            this.node.once('joined', resolve);
        });

        this.#log(`VON: joined network`);
    }

    /**
     * Notify the connected node that the node has moved. To be called after the node has updated its position.
     * @returns The response message from the node
     */
    async move() {
        const message = this.node.getIdentity();

        const seq = await this.#send({
            field: 'move',
            value: message
        });

        return new Promise<MoveResponseMessage>((resolve, reject) => {
            this.once('move-response', (res: MoveResponseMessage) => {
                if (res.sequence === seq) {
                    this.#log(`move-response(sequence=${seq})`, res);
                    resolve(res);
                }
            });
        });
    }

    async leave() {
        const neighbors = this.node.getNeighbors();

        await this.#send({
            field: 'leave',
            value: {
                identity: this.node.getIdentity(),
                neighbors: neighbors.map(n => vonNeighborToIdentity(n))
            }
        })
    }

    async leaveNotify(leaving: VONNeighbor): Promise<VONNeighbor[]> {
        const seq = await this.#send({
            field: 'leaveNotify',
            value: {
                identity: this.node.getIdentity(),
                leavingNode: vonNeighborToIdentity(leaving)
            }
        });

        return new Promise<VONNeighbor[]>((resolve, reject) => {
            this.once('leave-recover', (res: LeaveRecoverMessage) => {
                if (res.sequence === seq) {
                    resolve([...res.potentialNeighbors.map(n => identityToVONNeighbor(n)), ...res.oneHopNeighbors.map(n => identityToVONNeighbor(n))]);
                }
            });
        });
    }

    /**
     * Gracefully close the connection to the node if it is not yet closed.
     * @returns A promise that resolves when the connection has been closed.
     */
    terminate(): Promise<void> {
        if (!this.#conn.closed) {
            return new Promise<void>((resolve, reject) => {
                this.#conn.once('close', () => {
                    resolve();
                });
                this.#conn.end();
            });
        }

        return Promise.resolve();
    }

    /**
     * Packs a message into a VON packet and serializes it to binary protocol buffer format.
     * @param message The message to pack
     * @returns The packed message as a buffer
     */
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

    /**
     * Packs and sends a message over the connection.
     * @param message The message to send
     * @returns A promise that resolves when the message has been sent. The promise resolves with the sequence number of the message.
     */
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
        if (this.#logger) 
            this.#logger.info(args.map(a => stringify(a)).join(' '), { fromNode: this.node.id, toNode: this.addr ? `${this.addr?.hostname}:${this.addr?.port}`: undefined });
        else
            console.log(`[${this.node.id} -> ${this.addr ? `${this.addr?.hostname}:${this.addr?.port}`: 'unidentified'}]`, ...args);
    }
}