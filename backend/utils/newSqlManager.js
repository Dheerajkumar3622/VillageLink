/**
 * NewSQL Distributed Transaction Coordinator & Node Emulator
 * Implements a Two-Phase Commit (2PC) protocol to enforce ACID consistency across nodes.
 */

// Simulated geographic database nodes
const DB_NODES = {
    DELHI: { name: 'DELHI-NCR', online: true, store: new Map(), tempLogs: new Map() },
    MUMBAI: { name: 'MUMBAI-EDGE', online: true, store: new Map(), tempLogs: new Map() },
    KOLKATA: { name: 'KOLKATA-EDGE', online: true, store: new Map(), tempLogs: new Map() }
};

/**
 * Helper to toggle simulated node online status for disaster recovery tests
 */
export const setNodeOnlineStatus = (nodeKey, online) => {
    if (DB_NODES[nodeKey]) {
        DB_NODES[nodeKey].online = online;
    }
};

/**
 * Two-Phase Commit (2PC) Transaction Coordinator
 */
export const executeDistributedTransaction = (txId, key, value) => {
    const nodes = Object.keys(DB_NODES);
    
    console.log(`\n⚙️ 2PC Coordinator: Starting transaction [ID: ${txId}] (Set key "${key}" to "${value}").`);

    // --- PHASE 1: PREPARE PHASE ---
    console.log('   🗳️  Phase 1: Sending PREPARE requests to replica nodes...');
    const prepareSuccess = nodes.every(nodeKey => {
        const node = DB_NODES[nodeKey];
        if (!node.online) {
            console.error(`   ❌ Node Prepare Failed: Replica node [${node.name}] is offline.`);
            return false;
        }

        // Save write parameters to temporary logs (lock resources)
        node.tempLogs.set(txId, { key, value });
        console.log(`      -> Node [${node.name}]: PREPARED (Locked key "${key}")`);
        return true;
    });

    // --- PHASE 2: COMMIT OR ABORT ---
    if (prepareSuccess) {
        console.log('   ✅ Phase 1 Complete: All nodes prepared. Sending COMMIT requests...');
        nodes.forEach(nodeKey => {
            const node = DB_NODES[nodeKey];
            const log = node.tempLogs.get(txId);
            
            // Commit write to permanent storage and clear locks
            node.store.set(log.key, log.value);
            node.tempLogs.delete(txId);
            console.log(`      -> Node [${node.name}]: COMMITTED value successfully.`);
        });
        console.log(`🎉 2PC Coordinator: Transaction [ID: ${txId}] committed successfully.`);
        return { success: true, status: 'COMMITTED' };
    } else {
        console.error('   ❌ Phase 1 Failed: Aborting transaction. Sending ROLLBACK requests...');
        nodes.forEach(nodeKey => {
            const node = DB_NODES[nodeKey];
            // Clear locks and drop changes
            if (node.tempLogs.has(txId)) {
                node.tempLogs.delete(txId);
                console.log(`      -> Node [${node.name}]: ROLLED BACK (Cleared locks).`);
            }
        });
        console.log(`⚠️ 2PC Coordinator: Transaction [ID: ${txId}] aborted and rolled back.`);
        return { success: false, status: 'ROLLED_BACK' };
    }
};

/**
 * Gets the current store value from a specific node
 */
export const getReplicaValue = (nodeKey, key) => {
    return DB_NODES[nodeKey] ? DB_NODES[nodeKey].store.get(key) : null;
};
