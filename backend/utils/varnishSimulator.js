/**
 * Varnish Cache HTTP Reverse Proxy Accelerator Simulator
 * Processes URL paths against VCL policies to serve cached memory responses or bypass.
 */

export class VarnishCache {
    constructor() {
        this.cache = new Map();
        this.originLatencyMs = 120; // Simulated origin backend delay: 120ms
        this.varnishLatencyMs = 0.5; // Simulated Varnish memory cache latency: 0.5ms
    }

    /**
     * Inspects request path against VCL sub routines rules
     */
    evaluateVclPolicy(url) {
        // Match bypass rule: if path has /user/ or /wallet
        if (url.includes('/api/v1/user/') || url.includes('/api/v1/wallet')) {
            return 'PASS';
        }

        // Match cache rule: if path has /market-rates
        if (url.includes('/api/v1/market-rates')) {
            return 'HASH';
        }

        return 'PASS'; // default to bypass if no rule matched
    }

    /**
     * Intercepts HTTP request and resolves Cache Hits, Misses, and Bypasses
     */
    handleRequest(url, backendFetcher) {
        const policy = this.evaluateVclPolicy(url);

        if (policy === 'PASS') {
            console.log(`   [Varnish vcl_recv] PASS for "${url}". Bypassing cache to origin...`);
            const data = backendFetcher();
            return {
                status: 'PASS',
                latencyMs: this.originLatencyMs,
                data
            };
        }

        // Policy is HASH (cacheable)
        const cached = this.cache.get(url);
        if (cached) {
            console.log(`   [Varnish vcl_recv] HIT for "${url}". Serving from Varnish memory cache.`);
            return {
                status: 'HIT',
                latencyMs: this.varnishLatencyMs,
                data: cached.data
            };
        }

        console.log(`   [Varnish vcl_recv] MISS for "${url}". Fetching from origin and storing in Varnish...`);
        const data = backendFetcher();
        
        // Cache response (vcl_backend_response TTL simulation)
        this.cache.set(url, {
            data,
            cachedAt: Date.now()
        });

        return {
            status: 'MISS',
            latencyMs: this.originLatencyMs,
            data
        };
    }
}
