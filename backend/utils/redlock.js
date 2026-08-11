export class Redlock {
    constructor() {
        // Instantiates local simulation registry representing multi-node Redis cluster
        this.nodes = [
            { id: 'redis-node-1', online: true, locks: new Map() },
            { id: 'redis-node-2', online: true, locks: new Map() },
            { id: 'redis-node-3', online: true, locks: new Map() },
            { id: 'redis-node-4', online: true, locks: new Map() },
            { id: 'redis-node-5', online: true, locks: new Map() }
        ];
    }

    setNodeStatus(indexOrId, online) {
        let node = this.nodes[indexOrId];
        if (!node) {
            node = this.nodes.find(n => n.id === indexOrId);
        }
        if (node) {
            node.online = online;
            console.log(`   [Redlock] Cluster discovery: Node "${node.id}" status set to: ${online ? 'ONLINE' : 'OFFLINE'}`);
        }
    }

    acquire(resource, token, ttl = 10000) {
        let successfulWrites = 0;
        this.nodes.forEach(node => {
            if (node.online && !node.locks.has(resource)) {
                node.locks.set(resource, { token, expiresAt: Date.now() + ttl });
                successfulWrites++;
            }
        });

        const quorum = Math.floor(this.nodes.length / 2) + 1;
        if (successfulWrites >= quorum) {
            console.log(`   [Redlock] Lock ACQUIRED for "${resource}" (Quorum: ${successfulWrites}/${this.nodes.length} nodes in 0ms).`);
            return true;
        }

        // Rollback writes if quorum fails
        this.release(resource, token);
        console.log(`   [Redlock] Lock FAILED for "${resource}" (Quorum unmet: ${successfulWrites}/${this.nodes.length} writes succeeded).`);
        return false;
    }

    release(resource, token) {
        let clearedNodes = 0;
        this.nodes.forEach(node => {
            if (node.online && node.locks.has(resource)) {
                const lock = node.locks.get(resource);
                if (lock.token === token) {
                    node.locks.delete(resource);
                    clearedNodes++;
                }
            }
        });
        return { releasedNodesCount: clearedNodes };
    }
}
