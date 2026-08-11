/**
 * Token Bucket Rate Limiter
 * Limits incoming client request bursts while allowing a steady average rate.
 * Uses elapsed delta calculation to dynamically refill buckets on demand.
 */

const clientBuckets = new Map();

/**
 * Attempts to consume one token from a client's bucket.
 * Refills tokens dynamically based on the time elapsed since the last request.
 * @param {string} clientId Unique key identifying the client (e.g. IP or User ID)
 * @param {number} capacity Maximum bucket capacity (burst limit)
 * @param {number} refillRatePerSec Number of tokens refilled per second
 */
export const consumeToken = (clientId, capacity = 5, refillRatePerSec = 1) => {
    const now = Date.now();
    let bucket = clientBuckets.get(clientId);

    if (!bucket) {
        bucket = {
            tokens: capacity,
            lastRefill: now
        };
    } else {
        const elapsedSec = (now - bucket.lastRefill) / 1000;
        const refilledTokens = elapsedSec * refillRatePerSec;
        
        bucket.tokens = Math.min(capacity, bucket.tokens + refilledTokens);
        bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        clientBuckets.set(clientId, bucket);
        return true; // Request allowed
    }

    clientBuckets.set(clientId, bucket);
    return false; // Request throttled (rate limited)
};

/**
 * Gets the current token count inside a client's bucket
 */
export const getBucketStatus = (clientId) => {
    return clientBuckets.get(clientId) || null;
};

/**
 * Clears active bucket logs
 */
export const clearLimiterData = () => {
    clientBuckets.clear();
};
