/**
 * Offline-First Synchronization Engine
 * Simulates clients storing transactions locally and merging with the server.
 * Implements de-duplication (idempotency key tracking) and timestamp conflict resolution.
 */

// Simulated server database
export const serverDatabase = new Map();

// Track processed transaction UUIDs/IDs to prevent duplicate execution (idempotency)
const processedTxIds = new Set();

/**
 * Reconciles client mutations with the server database
 */
export const processClientSync = (clientId, mutations) => {
    let appliedCount = 0;
    let skippedCount = 0;

    console.log(`📡 Offline Sync: Processing ${mutations.length} mutations from Client [${clientId}]...`);

    mutations.forEach(mut => {
        const { txId, action, key, value, timestamp } = mut;

        // 1. Idempotency Check: Prevent duplicate syncs
        if (processedTxIds.has(txId)) {
            console.log(`   ⏭️  Skipping duplicate transaction [${txId}] (Already applied)`);
            skippedCount++;
            return;
        }

        // 2. Resolve Conflicts via LWW timestamp comparisons
        const existing = serverDatabase.get(key);
        if (!existing || timestamp > existing.timestamp) {
            serverDatabase.set(key, { value, timestamp });
            console.log(`   ✅ Applied mutation [${txId}]: Set ${key} = ${JSON.stringify(value)}`);
            appliedCount++;
        } else {
            console.log(`   ⚠️  Rejected mutation [${txId}] on key [${key}] (Server has newer data)`);
            skippedCount++;
        }

        // Mark transaction as processed
        processedTxIds.add(txId);
    });

    console.log(`🏁 Offline Sync: Synchronization finished. Applied: ${appliedCount}, Skipped: ${skippedCount}`);
    return { appliedCount, skippedCount };
};

/**
 * Diagnostic method to clear server DB
 */
export const clearServerDatabase = () => {
    serverDatabase.clear();
    processedTxIds.clear();
};
