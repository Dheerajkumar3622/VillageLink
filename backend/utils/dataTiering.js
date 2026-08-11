/**
 * Hot/Cold Data Tiering Manager
 * Manages active dataset ("hot") and historical archives ("cold").
 * Automatically migrates aged records to cold storage to optimize active index search speeds.
 */

// Active, fast-performance tier
const hotStore = new Map();

// Archive, cost-effective storage tier
const coldStore = new Map();

/**
 * Inserts a record into the active hot tier
 */
export const insertTieredRecord = (id, data, timestamp = Date.now()) => {
    hotStore.set(id, { data, timestamp });
    console.log(`🔥 Data Tiering: Inserted record [${id}] into HOT tier.`);
};

/**
 * Unified query interface resolving data from active or archived tiers
 */
export const queryTieredRecord = (id) => {
    if (hotStore.has(id)) {
        return { ...hotStore.get(id), tier: 'HOT' };
    }
    if (coldStore.has(id)) {
        return { ...coldStore.get(id), tier: 'COLD' };
    }
    return null;
};

/**
 * Sweeps active store and archives records older than threshold
 */
export const archiveAgedData = (thresholdMs) => {
    const now = Date.now();
    let migratedCount = 0;

    hotStore.forEach((record, id) => {
        const age = now - record.timestamp;
        if (age > thresholdMs) {
            // Move to cold archive
            coldStore.set(id, { data: record.data, archivedAt: now });
            hotStore.delete(id);
            migratedCount++;
            console.log(`❄️  Data Tiering: Migrated record [${id}] (Age: ${age}ms) to COLD tier.`);
        }
    });

    if (migratedCount > 0) {
        console.log(`✅ Data Tiering: Successfully archived ${migratedCount} records to cold storage.`);
    }
};

/**
 * Returns diagnostic size counts for both tiers
 */
export const getTierStats = () => {
    return {
        hotSize: hotStore.size,
        coldSize: coldStore.size
    };
};
