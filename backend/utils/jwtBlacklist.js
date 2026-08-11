/**
 * JSON Web Token (JWT) Blacklist revocation coordinator
 * Revokes stateless JWT signatures immediately with automatic memory TTL eviction.
 */

export class JwtBlacklist {
    constructor() {
        this.blacklist = new Map(); // token -> expiryTimestamp
        this.timers = new Map(); // token -> setTimeout reference
    }

    /**
     * Revokes a stateless token by adding it to the blacklist map with a TTL
     * @param {string} token Target JWT signature or token string
     * @param {number} expiresInMs Duration before token expires naturally
     */
    revokeToken(token, expiresInMs) {
        const expiry = Date.now() + expiresInMs;
        this.blacklist.set(token, expiry);

        // Clear existing timer if any
        if (this.timers.has(token)) {
            clearTimeout(this.timers.get(token));
        }

        // Set automatic TTL eviction timer to clean memory
        const timer = setTimeout(() => {
            this.blacklist.delete(token);
            this.timers.delete(token);
            console.log(`   [JWT Blacklist] Token TTL expired. Cleaned from memory registry.`);
        }, expiresInMs);

        // Ensure timer doesn't keep node process alive in tests if unref supported
        if (timer.unref) {
            timer.unref();
        }

        this.timers.set(token, timer);
        console.log(`   [JWT Blacklist] Token revoked successfully. TTL set: ${expiresInMs}ms.`);
    }

    /**
     * Validates if a token has been explicitly revoked
     */
    isTokenRevoked(token) {
        if (!this.blacklist.has(token)) {
            return false;
        }

        const expiry = this.blacklist.get(token);
        if (Date.now() > expiry) {
            // Evict immediately if check is done post-expiry but timer has not executed yet
            this.blacklist.delete(token);
            this.timers.delete(token);
            return false;
        }

        return true;
    }

    /**
     * Stops all active timers to prevent memory leaks during shutdowns/reloads
     */
    clearAllTimers() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.blacklist.clear();
    }
}
