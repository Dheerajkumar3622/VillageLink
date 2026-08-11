/**
 * Web Application Firewall (WAF) Layer-7 Security Middleware
 * Inspects incoming query, body, and header parameters against regex attack vectors.
 */

export class WafShield {
    constructor() {
        // Attack signatures
        this.signatures = {
            SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|UNION|DROP|ALTER|OR)\b.*(=|'|")|' OR '|--)/i,
            XSS: /(<script>|javascript:|onerror\s*=|onload\s*=|alert\(|<iframe)/i,
            PATH_TRAVERSAL: /(\.\.\/|\.\.\\)/
        };
    }

    /**
     * Recursively checks if any value in a payload matches an attack signature
     */
    inspectPayload(data) {
        if (!data) return { blocked: false };

        if (typeof data === 'string') {
            for (const [attackType, regex] of Object.entries(this.signatures)) {
                if (regex.test(data)) {
                    return {
                        blocked: true,
                        attackType,
                        offendingValue: data
                    };
                }
            }
        } else if (typeof data === 'object') {
            for (const value of Object.values(data)) {
                const check = this.inspectPayload(value);
                if (check.blocked) {
                    return check;
                }
            }
        }

        return { blocked: false };
    }

    /**
     * Processes request details (body, query, headers)
     */
    inspectRequest(req) {
        const bodyCheck = this.inspectPayload(req.body);
        if (bodyCheck.blocked) {
            console.warn(`   [WAF Shield] BLOCKED ${bodyCheck.attackType} attempt on payload: "${bodyCheck.offendingValue}"`);
            return bodyCheck;
        }

        const queryCheck = this.inspectPayload(req.query);
        if (queryCheck.blocked) {
            console.warn(`   [WAF Shield] BLOCKED ${queryCheck.attackType} attempt on query parameters: "${queryCheck.offendingValue}"`);
            return queryCheck;
        }

        return { blocked: false };
    }
}
