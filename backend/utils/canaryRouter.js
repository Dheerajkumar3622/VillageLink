import crypto from 'crypto';

/**
 * Canary Router Module
 * Directs traffic between release versions deterministically.
 * Uses hash values of user identities to pin sessions to stable or canary targets.
 */

/**
 * Routes a request based on user identity hashing
 * @param {string} userId Unique identifier for user/session
 * @param {number} canaryWeight Value between 0.0 and 1.0 (e.g. 0.1 for 10% canary traffic)
 */
export const routeRequest = (userId, canaryWeight = 0.10) => {
    if (!userId) return 'STABLE_V1';

    // MD5 hashing to ensure deterministic partition mapping
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    
    // Convert first 8 characters to integer
    const intVal = parseInt(hash.substring(0, 8), 16);
    
    // Scale to percentage scale (0 to 100)
    const ratio = (intVal % 10000) / 10000;

    if (ratio < canaryWeight) {
        return 'CANARY_V2';
    }
    return 'STABLE_V1';
};
