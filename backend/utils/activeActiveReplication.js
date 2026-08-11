/**
 * Multi-Region Active-Active Replication Coordinator
 * Simulates distributed nodes syncing mutations bidirectionally.
 * Implements Last-Write-Wins (LWW) timestamp comparisons to resolve replication conflicts.
 */

// Simulated regional databases
const regionalStores = {
    East: new Map(),
    West: new Map()
};

/**
 * Writes data locally to a target region and replicates to peers
 */
export const writeLocalRecord = (region, key, value, timestamp = Date.now()) => {
    const store = regionalStores[region];
    if (!store) throw new Error(`Unknown region: ${region}`);

    const existing = store.get(key);
    if (!existing || timestamp > existing.timestamp) {
        // Update local database
        store.set(key, { value, timestamp });
        console.log(`🌐 Active-Active [${region}]: Local write processed: Key=[${key}]`);

        // Replicate to all other regions
        Object.keys(regionalStores).forEach(peerRegion => {
            if (peerRegion !== region) {
                replicateRecord(peerRegion, region, key, value, timestamp);
            }
        });
    } else {
        console.log(`⚠️  Active-Active [${region}]: DROPPED local write for Key=[${key}] (LWW Conflict: Local version is newer)`);
    }
};

/**
 * Handles incoming replicated data from a peer region
 * Resolves conflicts via Last-Write-Wins (LWW) logic
 */
export const replicateRecord = (targetRegion, sourceRegion, key, value, sourceTimestamp) => {
    const store = regionalStores[targetRegion];
    const existing = store.get(key);

    // If no existing record, or if incoming timestamp is newer, accept update (LWW)
    if (!existing || sourceTimestamp > existing.timestamp) {
        store.set(key, { value, timestamp: sourceTimestamp });
        console.log(`🌐 Active-Active [${targetRegion}]: Applied replicated update from [${sourceRegion}] for Key=[${key}] (LWW Match)`);
    } else {
        console.log(`⚠️  Active-Active [${targetRegion}]: DROPPED out-of-order replication from [${sourceRegion}] for Key=[${key}] (LWW Conflict: Local version is newer)`);
    }
};

/**
 * Queries the regional database node
 */
export const queryLocalRecord = (region, key) => {
    const store = regionalStores[region];
    if (!store) return null;
    return store.get(key) || null;
};

/**
 * Diagnostic method to clear stores
 */
export const clearRegionalStores = () => {
    regionalStores.East.clear();
    regionalStores.West.clear();
};
