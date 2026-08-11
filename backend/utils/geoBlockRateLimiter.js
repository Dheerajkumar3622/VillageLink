/**
 * IP Rate Limiting with Geo-blocking Security Coordinator
 * Validates requester geographic country code and caps volumetric request speeds.
 */

export class GeoBlockRateLimiter {
    constructor() {
        this.allowedCountries = ['IN']; // Only allow India domestic traffic
        this.rateLimitLimit = 5; // Max 5 requests allowed per tracking window
        
        // Mock GeoIP mapping directory
        this.geoIpDatabase = {
            '103.45.22.12': 'IN',  // India IP
            '103.88.99.41': 'IN',  // India IP
            '185.220.10.5': 'US',  // United States IP
            '202.100.8.88': 'CN'   // China IP
        };

        this.requestTracker = new Map(); // IP -> request count
    }

    /**
     * Resolves an IP address to its corresponding ISO country code
     */
    resolveCountryCode(ipAddress) {
        return this.geoIpDatabase[ipAddress] || 'Unknown';
    }

    /**
     * Evaluates IP request permissions against rate limit thresholds and geography blocks
     */
    processRequest(ipAddress) {
        // 1. Resolve country and check geo-block policies (HTTP 403 Forbidden)
        const country = this.resolveCountryCode(ipAddress);
        
        if (!this.allowedCountries.includes(country)) {
            console.warn(`   [Geo-Block] Rejected request from IP "${ipAddress}" (Origin: "${country}"). Region is forbidden.`);
            return {
                allowed: false,
                statusCode: 403,
                reason: 'GEO_BLOCKED'
            };
        }

        // 2. Track connection rates (HTTP 429 Too Many Requests)
        let count = this.requestTracker.get(ipAddress) || 0;
        count++;
        this.requestTracker.set(ipAddress, count);

        if (count > this.rateLimitLimit) {
            console.warn(`   [Rate-Limiter] Rejected request from IP "${ipAddress}". Rate limit threshold (${this.rateLimitLimit}) exceeded.`);
            return {
                allowed: false,
                statusCode: 429,
                reason: 'RATE_LIMIT_EXCEEDED'
            };
        }

        return {
            allowed: true,
            statusCode: 200
        };
    }

    /**
     * Reset rate tracking counts (simulate sliding window eviction)
     */
    resetRates() {
        this.requestTracker.clear();
    }
}
