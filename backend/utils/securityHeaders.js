import helmet from 'helmet';

export class SecurityHeaders {
    constructor() {
        this.headersPolicy = {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' https://maps.googleapis.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline';",
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer-when-downgrade',
            'X-XSS-Protection': '1; mode=block'
        };
        this.helmetMiddleware = helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "https://maps.googleapis.com", "https://checkout.razorpay.com"],
                    styleSrc: ["'self'", "'unsafe-inline'"]
                }
            }
        });
    }

    apply(res) {
        // Apply raw header mapping policies for testing
        for (const [headerName, headerValue] of Object.entries(this.headersPolicy)) {
            res.setHeader(headerName, headerValue);
        }
        return res;
    }
}
