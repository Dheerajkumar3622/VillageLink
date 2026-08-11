/**
 * DDoS Scrubbing Center & Traffic Analyzer Simulator
 * Screen and filters incoming IP traffic streams to block volumetric floods.
 */

export class ScrubbingCenter {
    constructor() {
        this.ipCounters = new Map(); // ip -> request count
        this.blocklist = new Map(); // ip -> blockExpiryTime
        this.requestThreshold = 10; // Max allowed requests within a 50ms window
    }

    /**
     * Inspects traffic parameters and screens incoming IP requests
     */
    scrubTraffic(ipAddress) {
        const now = Date.now();

        // 1. Check if IP is currently blocklisted/quarantined
        if (this.blocklist.has(ipAddress)) {
            const expiry = this.blocklist.get(ipAddress);
            if (now < expiry) {
                console.log(`   [ScrubbingCenter] BLOCKED incoming packet from quarantined IP: "${ipAddress}"`);
                return {
                    pass: false,
                    status: 'BLOCKED'
                };
            } else {
                // Quarantine time expired, clean from blocklist
                this.blocklist.delete(ipAddress);
                this.ipCounters.set(ipAddress, 0);
            }
        }

        // 2. Increment connection count for IP
        let count = this.ipCounters.get(ipAddress) || 0;
        count++;
        this.ipCounters.set(ipAddress, count);

        // 3. If request rate exceeds volumetric threshold limit, trigger mitigation block
        if (count > this.requestThreshold) {
            const quarantineExpiry = now + 1000; // Block IP for 1 second
            this.blocklist.set(ipAddress, quarantineExpiry);
            console.warn(`   [ScrubbingCenter] MITIGATING volumetric flood from IP: "${ipAddress}" (Rate: ${count} req/window). Quarantined.`);
            return {
                pass: false,
                status: 'MITIGATED_AND_BLOCKED'
            };
        }

        return {
            pass: true,
            status: 'CLEAN'
        };
    }

    /**
     * Resets request windows counters
     */
    resetWindows() {
        this.ipCounters.clear();
    }
}
