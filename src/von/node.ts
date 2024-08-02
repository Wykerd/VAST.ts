import { DEFAULT_PORT } from "~/consts.js";
import { Type as Addr } from "~/proto/generated/messages/vast/Addr.js";
import { Vec2d, vec2dToProtobuf } from "~/spatial/types.js";
import { createServer, createConnection, Server } from 'node:net';
import { Delaunay, Voronoi } from 'd3-delaunay';
import { VONConnection } from "./connection.js";
import { Vector } from "~/spatial/Vector.js";
import { Identity } from "~/proto/generated/messages/vast/index.js";
import { VONNeighbor, identityToVONNeighbor, indexOfNeighbor } from "./neighbor.js";
import EventEmitter from "node:events";
import winston from "winston";
import { stringify } from "~/utils.js";

// All VON nodes have the following three core actions available to them:
export interface IVONNode {
    /// Node join a VON network
    join(url: string, position: Vec2d, aoiRadius: number): Promise<void>;
    join(hostname: string, port: number, position: Vec2d, aoiRadius: number): Promise<void>;
    /// Change position of the node in the virtual environment
    move(position: Vec2d): void;
    /// Node leaves the VON network
    leave(): void;
}

export type VONCreateOptions = {
    endpoint: Addr, 
    logger?: winston.Logger
} & ({
    url: string
} | {
    port: number, hostname?: string
});

export class VONNode extends EventEmitter implements IVONNode {
    #server: Server;
    #voronoi: Voronoi<Delaunay.Point>;
    #position: Vec2d = [0, 0];
    #aoiRadius: number = 0;
    #connections: VONConnection[] = [];
    #enclosingNeighbors: VONNeighbor[] = [];
    #logger?: winston.Logger;
    readonly addr: Addr;
    readonly id: string;

    private constructor(addr: Addr, server: Server, logger?: winston.Logger) { 
        super();
        this.#logger = logger;
        this.#log(`VON: created tcp server on`, server.address());

        this.#server = server;
        this.#voronoi = this.#computeVoronoi().voronoi;
        this.addr = addr;
        this.id = `${addr.hostname}:${addr.port}`;

        this.#server.on('connection', socket => {
            const incomingAddr: Addr = {
                hostname: socket.remoteAddress!,
                port: socket.remotePort!
            }

            this.#log(`VON: incoming connection from`, incomingAddr);

            const conn = new VONConnection(socket, this, undefined, this.#logger);

            this.#connections.push(conn);
        })
    }

    on(event: 'joined', listener: () => unknown): this;
    on(...args: Parameters<EventEmitter['on']>) {
        return super.on(...args);
    }

    /**
     * Create a new VON node instance.
     * @param params.endpoint This is the endpoint of the VON node. It will be used to accept incoming connections.
     *               The hostname should be the public IP address of the node or a domain name that resolves to the public IP address.
     * @param params.url The URL of the VON node. This will be used to create the underlying TCP listener.
     * @param params.port The port of the TCP listener.
     * @param params.hostname The hostname of the TCP listener. If not provided, the listener will listen on all interfaces (0.0.0.0)
     */
    static async create(params: VONCreateOptions): Promise<VONNode> {
        const nodeConnInfo: Addr = {
            hostname: '',
            port: 0
        }
        const logger = params.logger;
        if ('port' in params) {
            // Arguments are port and hostname
            nodeConnInfo.port = params.port;
            nodeConnInfo.hostname = params.hostname || '';
        } else {
            // Arguments are url
            const url = new URL(params.url);

            if (url.protocol !== 'von:')
                throw new Error('URL protocol must be von:');

            nodeConnInfo.hostname = url.hostname;
            nodeConnInfo.port = url.port ? parseInt(url.port) : DEFAULT_PORT;
        }

        // Create the underlying TCP listener
        const server = createServer();

        // Wait until the server is listening
        await new Promise<void>(resolve => server.listen(nodeConnInfo.port, nodeConnInfo.hostname || '0.0.0.0', resolve));

        // We're good to go
        return new VONNode(params.endpoint, server, logger);
    }

    /**
     * Establish a new VON network. This node becomes the first node in the network.
     * @param position Position of the node in the virtual environment.
     * @param aoiRadius Area of interest radius.
     */
    initial(position: Vec2d, aoiRadius: number): void {
        this.#position = position;
        this.#aoiRadius = aoiRadius;

        this.#voronoi = this.#computeVoronoi().voronoi;

        this.#log(`VON: initial position set to`, this.#position);
        this.#log(`VON: initial AOI radius set to`, this.#aoiRadius);
    }

    /**
     * Join node into an existing VON network by connecting to a gateway node.
     * @param url The URL of the gateway node.
     * @param position The requested position of the node in the virtual environment.
     * @param aoiRadius The requested area of interest radius.
     */
    join(url: string, position: Vec2d, aoiRadius: number): Promise<void>;
    /**
     * Join node into an existing VON network by connecting to a gateway node.
     * @param hostname The hostname of the gateway node.
     * @param port The port of the gateway node.
     * @param position The requested position of the node in the virtual environment.
     * @param aoiRadius The requested area of interest radius.
     */
    join(hostname: string, port: number, position: Vec2d, aoiRadius: number): Promise<void>;
    async join(...params: unknown[]): Promise<void> {
        const gwConnInfo: Addr = {
            hostname: '',
            port: 0
        }

        let position: Vec2d;
        let aoiRadius: number;
        
        if (typeof params[1] === 'number') {
            // arguments are hostname and port
            gwConnInfo.hostname = params[0] as string;
            gwConnInfo.port = params[1];

            position = params[2] as Vec2d;
            aoiRadius = params[3] as number;
        } else {
            // arguments are url
            const url = new URL(params[0] as string);
            gwConnInfo.hostname = url.hostname;
            gwConnInfo.port = url.port ? parseInt(url.port) : DEFAULT_PORT;
            if (!Number.isFinite(gwConnInfo.port)) {
                throw new Error('Invalid port number');
            }

            position = params[1] as Vec2d;
            aoiRadius = params[2] as number;
        }

        if (gwConnInfo.hostname === '' || gwConnInfo.port === 0) {
            throw new Error('Invalid gateway connection information');
        }

        this.#log(`VON: joining gateway at`, gwConnInfo);

        this.#position = position;
        this.#aoiRadius = aoiRadius;

        // Connect to the gateway
        const conn = await this.getConnection(gwConnInfo);
        return conn.join();
    }

    async getConnection(addr: Addr) {
        const conn = this.#connections.find(c => c.addr?.hostname === addr.hostname && c.addr.port === addr.port);

        if (!conn) {
            return this.#createConnection(addr);
        }

        return conn;
    }

    hasConnection(addr: Addr) {
        return this.#connections.some(c => c.addr?.hostname === addr.hostname && c.addr.port === addr.port);
    }

    getIdentity(): Identity {
        return {
            addr: this.addr,
            pos: vec2dToProtobuf(this.#position),
            aoiRadius: this.#aoiRadius
        }
    }

    /**
     * Do not use directly. Use `getConnection` instead. That will ensure only one connection is created per address.
     * @param addr The address to open a connection to.
     * @returns The connection object.
     */
    async #createConnection(addr: Addr) {
        const conn = createConnection(addr.port, addr.hostname);

        await new Promise<void>((resolve, reject) => {
            function handleError(err: unknown) {
                reject(err);
            }
            conn.once('error', handleError);
            conn.once('connect', () => {
                conn.off('error', handleError);
                resolve();
            });
        });

        this.#log(`VON: connected to`, addr);

        const vonConn = new VONConnection(conn, this, addr, this.#logger);

        this.#connections.push(vonConn);
        
        return vonConn;
    }

    #computeVoronoi(additionalConsiderations: Vec2d[] = []) {
        // for the neighborhood, we always make the first node the current node so we can easily index it
        const neighborhood: Vec2d[] = [
            this.#position,
            ...this.#enclosingNeighbors.map(n => n.position)
        ];

        const additionalConsiderationsOffset = neighborhood.length;

        // add additional considerations
        neighborhood.push(...additionalConsiderations);

        // calculate some made up bounds since d3-delaunay requires it. We'll use the min/max of the position
        // according to the documentation, the bounds only affec the rendering methods, so we needn't worry about it
        const minX = Math.min(...neighborhood.map(v => v[0]));
        const minY = Math.min(...neighborhood.map(v => v[1]));
        const maxX = Math.max(...neighborhood.map(v => v[0]));
        const maxY = Math.max(...neighborhood.map(v => v[1]));

        const delaunay = Delaunay.from(neighborhood);
        const voronoi = delaunay.voronoi([
            minX - 1,
            minY - 1,
            maxX + 1,
            maxY + 1
        ]);

        // update the voronoi
        return {
            voronoi,
            additionalConsiderationsOffset
        };
    }

    /**
     * Checks if the current node contain the given point in its region.
     * @param point The point to check
     * @returns `true` if the current node contains the point, otherwise `false`.
     */
    containsPoint(point: Vec2d) {
        // zero index is the current node
        // so we see if index 0 contains the point (this node contains the point)
        return this.#voronoi.contains(0, point[0], point[1]);
    }

    /**
     * Implements point forwarding algorithm.
     * 
     * The point forwarding algorithm is used to forward a message to the node whose region contains a given *target point*.
     * @param point The target point.
     * @returns `true` if the current node contains the target point, otherwise the next node in the sequence to forward the message to.
     */
    pointForward(point: Vec2d): true | VONNeighbor {
        // If the *current node* contains the *target point* in its region, then the *current node* is the *target node* and we have reached our destination.
        if (this.containsPoint(point))
            return true;

        // Find the neighbor of the *current node* that is closest to the *target point*. This is the *candidate node*.
        if (this.#enclosingNeighbors.length === 0)
            // If there's no neighbors, all points should be in the current node
            // This should not be possible, but just in case
            throw new Error('No neighbors available for point forwarding.');

        const thisVector = Vector.fromVec2d(this.#position);

        let candidate = this.#enclosingNeighbors[0];
        let candidateDistance = Infinity;

        for (const neighbor of this.#enclosingNeighbors) {
            const neighborVector = Vector.fromVec2d(neighbor.position);
            const distance = thisVector.distance2(neighborVector);

            if (distance < candidateDistance) {
                candidate = neighbor;
                candidateDistance = distance;
            }
        }

        return candidate;
    }

    /**
     * Adds a new node to the list of known nodes.
     * 
     * Updates the local Voronoi diagram and the list of enclosing neighbors.
     * @param node The node to add to the local Voronoi diagram.
     * @returns The new node's enclosing neighbors as known by the current node.
     */
    addNode(node: VONNeighbor) {
        // The *node* creates a *EN node set* containing its current *EN neighbors* and the *joining node*.
        // The *node* creates a *local Voronoi diagram* using the *EN node set*.
        const { 
            voronoi,
            additionalConsiderationsOffset
        } = this.#computeVoronoi([node.position]);

        this.#voronoi = voronoi;

        // The *node* determines its new *EN neighbors* from the constructed *local Voronoi diagram*.
        const neighbors = Array.from(voronoi.neighbors(0));

        // The *node* updates its *EN neighbors* to the new set determined from the *local Voronoi diagram*.
        const newNeighborhood = neighbors.map(n => {
            if (n < additionalConsiderationsOffset) // we're considering the exiting neighbors
                return this.#enclosingNeighbors[n - 1]; // remember that the first node is the current node so we need to offset by 1
            else
                return node;
        })

        // The *acceptor node* determines the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
        const newNodeExpectedNeighborIndices = Array.from(voronoi.neighbors(additionalConsiderationsOffset));

        const newNodeExpectedNeighbors = newNodeExpectedNeighborIndices.map(n => {
            if (n == 0)
                return null;
            if (n < additionalConsiderationsOffset)
                return this.#enclosingNeighbors[n - 1];
            
            throw new Error('Invalid neighbor index');
        });

        this.#enclosingNeighbors = newNeighborhood;

        return {
            newExpectedNeighbors: newNodeExpectedNeighbors.filter(n => n !== null) as VONNeighbor[],
            isEnclosing: newNodeExpectedNeighbors.some(n => n == null)
        }
    }

    getNeighborNeighbors(neighbor: VONNeighbor) {
        const neighborIndex = indexOfNeighbor(this.#enclosingNeighbors, neighbor.addr);
        if (neighborIndex === -1)
            throw new Error('Neighbor not found');

        const neighborIndices = Array.from(this.#voronoi.neighbors(neighborIndex + 1));

        return neighborIndices.map(n => {
            if (n === 0)
                return identityToVONNeighbor(this.getIdentity());
            return this.#enclosingNeighbors[n - 1];
        });
    }

    /**
     * The *remove node algorithm* is used by a *node* to remove a *leaving node* from its neighborhood.
     * @param leaving The leaving node.
     * @param _notifyableNeighbors The list of notifyable neighbors, if available from a LEAVE message.
     */
    async removeNode(leaving: VONNeighbor, _notifyableNeighbors?: VONNeighbor[]) {
        const leavingIndex = indexOfNeighbor(this.#enclosingNeighbors, leaving.addr);

        // 1. If the *leaving node* is not a neighbor of the *node*, the algorithm ends.
        if (leavingIndex === -1) 
            return;

        // 2. If available from a *LEAVE message*, consider all the *EN neighbors* of the *leaving node* as *notifyable neighbors*. Otherwise, consider all *overlap neighbors* of the *leaving node* as *notifyable neighbors*.
        const notifyableNeighbors = Array.isArray(_notifyableNeighbors) ? _notifyableNeighbors : this.#computeOverlapNeighbors(leaving);

        // 3. Terminate the connection to the *leaving node* and remove it from the *EN neighbors* and *local Voronoi diagram*.
        this.#enclosingNeighbors.splice(leavingIndex, 1);

        // 3. Send a *LEAVE NOTIFY message* to each of the *notifyable neighbors*.
        const potentialENs: VONNeighbor[] = this.getNeighbors();
        for (const neighbor of notifyableNeighbors) {
            const conn = await this.getConnection(neighbor.addr);
            const potentialNeighbors = await conn.leaveNotify(leaving);
            potentialENs.push(...potentialNeighbors);
        }

        // 4. The node uses the complete set of *potential EN neighbors* from the *overlap neighbors* to update its *EN neighbors*.
        // 5. The *node* updates its *local Voronoi diagram* to reflect the new *EN neighbors*.
        this.addMultipleNodes(potentialENs);
    }

    /**
     * Calculates neighbors that are common between the current node and another node.
     * 
     * @param other The other node to compute overlap neighbors with
     * @returns The overlap neighbors between the current node and the other node
     */
    #computeOverlapNeighbors(other: VONNeighbor): VONNeighbor[] {
        const otherNodeIndex = indexOfNeighbor(this.#enclosingNeighbors, other.addr);

        const thisNodeNeighborsIds = Array.from(this.#voronoi.neighbors(0));

        const otherNodeNeighborsIds = Array.from(this.#voronoi.neighbors(otherNodeIndex + 1));

        const commonNeighborsIds = thisNodeNeighborsIds.filter(id => otherNodeNeighborsIds.includes(id));

        const commonNeighbors = commonNeighborsIds.map(id => {
            if (id === 0)
                return identityToVONNeighbor(this.getIdentity());
            return this.#enclosingNeighbors[id - 1];
        });

        return commonNeighbors;
    }

    /**
     * Get a list of enclosing neighbors (ENs)
     * @returns A list of enclosing neighbors
     */
    getNeighbors(): VONNeighbor[] {
        return [...this.#enclosingNeighbors];
    }

    /**
     * Clears the list of neighbors. Don't use this unless you know what you're doing (for internal use)
     */
    clearNeighbors() {
        this.#enclosingNeighbors = [];
    }

    addMultipleNodes(nodes: VONNeighbor[]) {
        const additionalConsiderations = nodes.map(n => n.position);

        const { 
            voronoi,
            additionalConsiderationsOffset
        } = this.#computeVoronoi(additionalConsiderations);

        this.#voronoi = voronoi;

        const neighbors = Array.from(voronoi.neighbors(0));

        const newNeighborhood = neighbors.map(n => {
            if (n < additionalConsiderationsOffset)
                return this.#enclosingNeighbors[n - 1];
            else
                return nodes[n - additionalConsiderationsOffset];
        });

        this.#enclosingNeighbors = newNeighborhood;
    }


    moveNeighbor(neighbor: VONNeighbor): VONNeighbor[] {
        // The *node* updates its *local Voronoi diagram* to reflect the new position of the *moving node*.
        // we need to determine if the node is already present in the list of neighbors
        const neighborIndex = indexOfNeighbor(this.#enclosingNeighbors, neighbor.addr);

        // if the node is already in the EN list, we need to remove it.
        if (neighborIndex !== -1) {
            this.#enclosingNeighbors.splice(neighborIndex, 1);
        }

        // now we reinsert the node into the EN list
        return this.addNode(neighbor).newExpectedNeighbors;
    }

    /**
     * Move the node to a new position in the VON.
     * @param position New position of the node in the virtual environment.
     */
    async move(position: Vec2d): Promise<void> {
        // TODO: parallelize this

        // The *moving node* creates a set of *EN nodes* from its current *EN neighbors*.
        const neighbors = this.getNeighbors(); // this creates a copy of the array so we can play around with it.
        const unseenNeighbors: Addr[] = neighbors.map(n => n.addr);
        const neighborIdSet = new Set(neighbors.map(n => `${n.addr.hostname}:${n.addr.port}`));

        this.#position = position;

        // The *moving node* enters a loop while it has not yet contacted all the *EN nodes* in the set:
        while (unseenNeighbors.length > 0) {
            const considering = unseenNeighbors.pop()!;
            const conn = await this.getConnection(considering);
            // The *moving node* notifies all the nodes in the *EN node* set that has not yet been contacted of its move using a *MOVE message*. The recipient nodes run the *move node algorithm* apon receiving the message.
            // The *moving node* waits for a *MOVE RESPONSE message* from each of the *EN neighbors*. This includes a list of *potential EN neighbors* of the *moving node*.
            const res = await conn.move();
            const newNeighbors: Identity[] = [];
            for (const neighbor of res.neighbors) {
                if (!neighbor.addr || !neighbor.pos || !neighbor.aoiRadius)
                    continue; // XXX: maybe handle this with an invalid response error?

                const neighborId = `${neighbor.addr.hostname}:${neighbor.addr.port}`;
                // we don't want to add duplicates
                if (neighborIdSet.has(neighborId)) continue;
                neighborIdSet.add(neighborId);
                // this node is indeed unseen
                newNeighbors.push(neighbor);
            }

            // right, we've got new neighbors. Let's add them to the list of neighbors
            const vonNeighbors = newNeighbors.map(identity => identityToVONNeighbor(identity));
            // These nodes are added to the *EN node set*.
            neighbors.push(...vonNeighbors);
            unseenNeighbors.push(...vonNeighbors.map(n => n.addr));
        }

        // The *moving node* uses all the nodes in the *EN node set* to create a *local Voronoi diagram*.
        this.clearNeighbors();
        // this takes care of updating the voronoi and also updating the EN list.
        this.addMultipleNodes(neighbors);
    }

    async leave() {
        // 1. The *leaving node* sends a *LEAVE message* to all its *EN neighbors* containing a list of all its *EN neighbors*.
        const neighbors = this.getNeighbors();
        for (const neighbor of neighbors) {
            const conn = await this.getConnection(neighbor.addr);
            await conn.leave();
            // 2. Either the *leaving node* or the *EN neighbors* will then terminate the connection, whichever comes first.
            await conn.terminate();
        }
    }

    #log(...args: unknown[]) {
        if (this.#logger) 
            this.#logger.info(args.map(a => stringify(a)).join(' '), { node: this.id });
        else
            console.log(`[${this.id}]`, ...args);
    }
}