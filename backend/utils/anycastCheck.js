/**
 * Anycast Routing Detection Middleware
 * Identifies and logs regional Anycast edge servers handling user requests
 */

export const anycastDetector = (req, res, next) => {
    const cfRay = req.headers['cf-ray'];
    const cfIpCountry = req.headers['cf-ipcountry'];
    const cloudfrontEdge = req.headers['x-edge-location'] || req.headers['x-amz-cf-id'] ? 'CloudFront' : null;

    let edgeLocation = 'Direct/Unknown';
    let country = cfIpCountry || 'Unknown';
    let provider = 'Origin Server';

    if (cfRay) {
        provider = 'Cloudflare Anycast CDN';
        // Extract 3-letter IATA code from the end of CF-Ray (e.g. 7e2b1029da9f18a2-CCU)
        const parts = cfRay.split('-');
        if (parts.length > 1) {
            edgeLocation = parts[parts.length - 1].toUpperCase();
        }
    } else if (cloudfrontEdge) {
        provider = 'AWS CloudFront Anycast CDN';
        edgeLocation = req.headers['x-edge-location'] || 'AWS Edge';
    }

    // Attach edge details to req object for trace tracking
    req.edgeInfo = {
        provider,
        edgeLocation,
        country,
        timestamp: Date.now()
    };

    // Log the request routing path in debug/dev log
    if (cfRay || cloudfrontEdge) {
        console.log(`🌐 Anycast Route: Request from ${country} handled by ${provider} Edge Node: [${edgeLocation}]`);
    }

    next();
};
