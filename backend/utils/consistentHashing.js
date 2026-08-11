/**
 * Consistent Hash Ring Engine
 * Maps physical nodes and data keys to a 32-bit integer ring using FNV-1a hash.
 * Uses Virtual Nodes to ensure uniform distribution and prevent hot node clustering.
 */

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * Fast FNV-1a 32-bit hashing algorithm.
 * Returns an unsigned 32-bit integer.
 */
export const hashFnv32 = (str) => {
    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0; // Convert to unsigned 32-bit int
};

export class ConsistentHashRing {
    constructor(virtualNodesCount = 40) {
        this.virtualNodesCount = virtualNodesCount;
        this.ring = {}; // Position (hash) -> Physical Node
        this.sortedKeys = []; // Array of sorted hash positions
        this.nodes = new Set();
    }

    /**
     * Adds a physical node to the ring, generating virtual replicas
     */
    addNode(node) {
        this.nodes.add(node);
        for (let i = 0; i < this.virtualNodesCount; i++) {
            const virtualNodeKey = `${node}-vnode-${i}`;
            const hash = hashFnv32(virtualNodeKey);
            this.ring[hash] = node;
            this.sortedKeys.push(hash);
        }
        this.sortedKeys.sort((a, b) => a - b);
    }

    /**
     * Removes a physical node and its virtual replicas from the ring
     */
    removeNode(node) {
        this.nodes.delete(node);
        for (let i = 0; i < this.virtualNodesCount; i++) {
            const virtualNodeKey = `${node}-vnode-${i}`;
            const hash = hashFnv32(virtualNodeKey);
            delete this.ring[hash];
        }
        // Re-generate sorted keys list
        this.sortedKeys = Object.keys(this.ring).map(Number).sort((a, b) => a - b);
    }

    /**
     * Resolves the target physical node for a given key by finding
     * the next clockwise replica on the ring.
     */
    getNode(key) {
        if (this.sortedKeys.length === 0) {
            return null;
        }

        const hash = hashFnv32(key);
        
        // Binary search to find closest node >= hash
        let low = 0;
        let high = this.sortedKeys.length - 1;
        let index = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedKeys[mid] >= hash) {
                index = mid;
                high = mid - 1; // Try to find a closer match to the left
            } else {
                low = mid + 1;
            }
        }

        // If key hash is larger than all ring keys, wrap around to first index (0)
        if (this.sortedKeys[index] < hash) {
            index = 0;
        }

        const finalHash = this.sortedKeys[index];
        return this.ring[finalHash];
    }

    /**
     * Returns list of all active physical nodes
     */
    getNodes() {
        return Array.from(this.nodes);
    }
}
