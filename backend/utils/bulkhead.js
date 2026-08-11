/**
 * Bulkhead Concurrency Isolation Manager
 * Partitions execution pipelines into isolated resource pools.
 * Prevents heavy compute operations (like image processing) from saturating core APIs.
 */

const pools = new Map();

/**
 * Registers an isolated service concurrency pool
 */
export const createPool = (name, maxConcurrency) => {
    pools.set(name, {
        maxConcurrency,
        activeCount: 0
    });
    return pools.get(name);
};

/**
 * Executes action within specified pool boundaries, or rejects if bulkhead is saturated
 */
export const executeTask = async (poolName, taskFn, rejectFn) => {
    let pool = pools.get(poolName);
    
    // Create default fallback pool if not registered
    if (!pool) {
        pool = createPool(poolName, 5);
    }

    if (pool.activeCount >= pool.maxConcurrency) {
        return rejectFn();
    }

    pool.activeCount++;
    try {
        const result = await taskFn();
        return result;
    } finally {
        pool.activeCount--;
    }
};

/**
 * Retrieves list of active pool counts
 */
export const getPoolStatus = (poolName) => {
    return pools.get(poolName) || null;
};
