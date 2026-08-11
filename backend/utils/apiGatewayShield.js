/**
 * API Gateway Shielding Engine
 * Intercepts requests at the network edge boundary to validate structure, size, and headers.
 */

export class GatewayShield {
    constructor() {
        this.maxPayloadSizeLimit = 1048576; // 1 MB payload limit
        this.requiredHeaders = ['authorization', 'x-villagelink-client'];
        this.allowedOrigins = ['https://villagelink.in', 'https://kisan.villagelink.in'];
    }

    /**
     * Inspects request metadata and content length at the gateway boundary
     */
    inspectRequest(req) {
        // 1. Enforce payload size limit (HTTP 413 Payload Too Large)
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        
        if (contentLength > this.maxPayloadSizeLimit) {
            console.warn(`   [GatewayShield] Blocked: Payload size (${contentLength} B) exceeds limit (${this.maxPayloadSizeLimit} B).`);
            return {
                allowed: false,
                statusCode: 413,
                reason: 'PAYLOAD_TOO_LARGE'
            };
        }

        // 2. Validate mandatory request headers (HTTP 400 Bad Request)
        const missingHeader = this.requiredHeaders.find(h => !req.headers[h]);
        if (missingHeader) {
            console.warn(`   [GatewayShield] Blocked: Missing mandatory request header: "${missingHeader}".`);
            return {
                allowed: false,
                statusCode: 400,
                reason: `MISSING_HEADER_${missingHeader.toUpperCase()}`
            };
        }

        // 3. Verify CORS Origin matches list (HTTP 403 Forbidden)
        const origin = req.headers['origin'];
        if (origin && !this.allowedOrigins.includes(origin)) {
            console.warn(`   [GatewayShield] Blocked: CORS origin violation for origin: "${origin}".`);
            return {
                allowed: false,
                statusCode: 403,
                reason: 'CORS_VIOLATION'
            };
        }

        return {
            allowed: true,
            statusCode: 200
        };
    }
}
