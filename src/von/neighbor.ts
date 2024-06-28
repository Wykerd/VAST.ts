import { Addr, Identity } from "~/proto/generated/messages/vast/index.js";
import { Vec2d, vec2dFromProtobuf, vec2dToProtobuf } from "~/spatial/types.js";
import { VONConnection } from "./connection.js";

export interface VONNeighbor {
    addr: Addr;
    position: Vec2d;
    aoiRadius: number;
    conn?: VONConnection;
}

/**
 * Returns the index of the neighbor with the given address
 * @param neighbors The list of neighbors to search
 * @param addr The address to search for
 * @returns The index of the neighbor, or -1 if not found
 */
export function indexOfNeighbor(neighbors: VONNeighbor[], addr: Addr): number {
    return neighbors.findIndex(n => n.addr.hostname === addr.hostname && n.addr.port === addr.port);
}

/**
 * Removes any duplicate neighbors from the list
 * @param neighbors List of neighbors to deduplicate
 * @returns A list of unique neighbors
 */
export function deduplicateNeighbors(neighbors: VONNeighbor[]): VONNeighbor[] {
    const deduped: VONNeighbor[] = [];
    const seen: Set<string> = new Set();

    for (const neighbor of neighbors) {
        const id = `${neighbor.addr.hostname}:${neighbor.addr.port}`;
        if (seen.has(id)) continue;

        deduped.push(neighbor);
        seen.add(id);
    }

    return deduped;
}

/**
 * Filter out neighbors with addresses in the exclude list
 * @param neighbors List of neighbors to filter
 * @param exclude List of addresses to exclude
 * @returns The filtered list of neighbors
 */
export function excludeNeighbors(neighbors: VONNeighbor[], exclude: Addr[]): VONNeighbor[] {
    return neighbors.filter(n => !exclude.some(e => e.hostname === n.addr.hostname && e.port === n.addr.port));
}

/**
 * Convert protobuf identity to VONNeighbor
 * @param identity Identity to convert
 * @returns The converted VONNeighbor
 */
export function identityToVONNeighbor(identity: Identity): VONNeighbor {
    if (!identity.addr || !identity.pos || !identity.aoiRadius)
        throw new Error(`Invalid identity: ${JSON.stringify(identity)}`);

    return {
        addr: identity.addr,
        position: vec2dFromProtobuf(identity.pos),
        aoiRadius: identity.aoiRadius
    }
}

/**
 * Convert VONNeighbor to protobuf identity for serialization
 * @param neighbor Neighbor to convert
 * @returns The converted Identity
 */
export function vonNeighborToIdentity(neighbor: VONNeighbor): Identity {
    return {
        addr: neighbor.addr,
        pos: vec2dToProtobuf(neighbor.position),
        aoiRadius: neighbor.aoiRadius
    }
}