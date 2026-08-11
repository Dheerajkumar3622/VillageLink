/**
 * Write-Back Caching Coordinator
 * Stores writes in a fast memory cache and acknowledges requests immediately.
 * Tracks "dirty" keys and persists changes to the database in scheduled background batches.
 */

// Simulated fast in-memory cache
const inMemoryCache = new Map();

// Track keys updated in cache but not yet persisted to DB
const dirtyKeys = new Set();

// Simulated persistent database store
export const mockDatabaseStore = new Map();

let flushIntervalId = null;

/**
 * Reads value: returns from cache if present (read-through/look-aside),
 * otherwise falls back to persistent database.
 */
export const writeBackCacheGet = (key) => {
    if (inMemoryCache.has(key)) {
        return inMemoryCache.get(key);
    }
    return mockDatabaseStore.get(key) || null;
};

/**
 * Writes value: updates memory cache instantly, marks key as dirty,
 * and returns success immediately (write-back).
 */
export const writeBackCacheSet = (key, value) => {
    inMemoryCache.set(key, value);
    dirtyKeys.add(key);
    return { status: 'ACKNOWLEDGED', inMemory: true };
};

/**
 * Background worker: Persists all dirty cache entries to database
 */
export const flushDirtyCache = () => {
    if (dirtyKeys.size === 0) return;

    console.log(`🧹 Write-Back Cache: Flushing ${dirtyKeys.size} dirty keys to persistent store...`);
    
    dirtyKeys.forEach(key => {
        const val = inMemoryCache.get(key);
        mockDatabaseStore.set(key, val);
    });

    dirtyKeys.clear();
    console.log('   ✅ Write-Back Cache: Database write synchronization complete.');
};

/**
 * Starts the automatic background flushing scheduler
 */
export const startScheduledFlush = (intervalMs = 3000) => {
    if (flushIntervalId) {
        clearInterval(flushIntervalId);
    }
    flushIntervalId = setInterval(() => {
        flushDirtyCache();
    }, intervalMs);
    console.log(`⏱️ Write-Back Cache: Scheduled automatic flush job active (Interval: ${intervalMs}ms).`);
};

/**
 * Stops the flush job
 */
export const stopScheduledFlush = () => {
    if (flushIntervalId) {
        clearInterval(flushIntervalId);
        flushIntervalId = null;
    }
};

/**
 * Returns list of current dirty keys count
 */
export const getDirtyKeysCount = () => {
    return dirtyKeys.size;
};
