/**
 * Exponential Backoff with Jitter
 * Prevents thundering herd problems during offline recovery and client sync retries.
 * Applies random noise (jitter) to exponentially growing delay caps.
 */

/**
 * Calculates retry delay in milliseconds using exponential growth and full jitter
 * @param {number} attempt Attempt index (0-indexed)
 * @param {number} baseDelayMs Base starting delay
 * @param {number} maxDelayMs Maximum ceiling cap delay
 * @param {number} factor Exponential base multiplier
 */
export const calculateBackoffDelay = (attempt, baseDelayMs = 1000, maxDelayMs = 30000, factor = 2) => {
    // expDelay = baseDelayMs * (factor ^ attempt)
    const expDelay = baseDelayMs * Math.pow(factor, attempt);
    const cappedDelay = Math.min(expDelay, maxDelayMs);
    
    // Apply full jitter: random value between 0 and capped delay
    const finalDelay = Math.random() * cappedDelay;

    return Math.round(finalDelay);
};

/**
 * Retries a promise-returning function with exponential backoff and jitter
 */
export const retryWithBackoff = async (taskFn, maxAttempts = 3, baseDelayMs = 1000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await taskFn();
        } catch (error) {
            if (attempt === maxAttempts - 1) throw error;
            
            const delay = calculateBackoffDelay(attempt, baseDelayMs);
            console.log(`   [Retry] Attempt ${attempt + 1} failed. Backing off for ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};
