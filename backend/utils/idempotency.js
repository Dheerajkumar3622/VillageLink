/**
 * API Request Idempotency Manager
 * Intercepts duplicate calls presenting matching unique keys.
 * Returns cached responses to guarantee single execution safety for critical actions.
 */

const idempotencyStore = new Map();

/**
 * Wraps action execution with an idempotency key lookup checker
 * @param {string} key Unique request key (UUID/Header)
 * @param {Function} executeFn Action callback logic
 */
export const processIdempotentRequest = async (key, executeFn) => {
    if (!key) {
        // Fallback: run action directly if no key is provided
        return executeFn();
    }

    if (idempotencyStore.has(key)) {
        console.log(`   [Idempotency] Duplicate request intercepted for key: "${key}". Returning cached result.`);
        return idempotencyStore.get(key);
    }

    // Process action for the first time
    const result = await executeFn();
    
    // Cache response
    idempotencyStore.set(key, result);
    return result;
};

/**
 * Returns currently cached keys count
 */
export const getIdempotencyCacheSize = () => {
    return idempotencyStore.size;
};

/**
 * Clears cached transactions logs
 */
export const clearIdempotencyData = () => {
    idempotencyStore.clear();
};
