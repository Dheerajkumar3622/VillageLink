/**
 * Dynamic Routing and Request Rewrite Middleware Simulator
 * Evaluates headers, query tags, and service states to dynamically route requests.
 */

export class DynamicRouter {
    constructor() {
        this.servicesHealth = {
            'billing-service': 'UP',
            'mandi-dispatch-service': 'UP'
        };
    }

    /**
     * Set target service status (simulating dynamic discovery changes)
     */
    setServiceStatus(serviceName, status) {
        this.servicesHealth[serviceName] = status;
        console.log(`   [Dynamic Router] Discover: Service "${serviceName}" state updated to: ${status}`);
    }

    /**
     * Resolves and rewrites incoming request target destinations
     */
    resolveRoute(request) {
        const originalPath = request.path;
        let rewrittenPath = originalPath;
        let ruleApplied = 'NONE';

        // 1. Failover Check: If target service is DOWN, route to offline fallback
        if (request.targetService && this.servicesHealth[request.targetService] === 'DOWN') {
            rewrittenPath = '/api/v1/fallback-offline-mode';
            ruleApplied = 'FAILOVER_SERVICE_DOWN';
        }
        // 2. Header-Based Routing: Route Kisan role to dedicated Kisan portal
        else if (request.headers && request.headers['x-user-role'] === 'kisan') {
            rewrittenPath = `/api/v1/kisan-hub${originalPath}`;
            ruleApplied = 'HEADER_USER_ROLE';
        }
        // 3. Query-Based Routing: Redirect beta flag users to v2 endpoint
        else if (request.query && request.query.beta === 'true') {
            rewrittenPath = originalPath.replace('/v1/', '/v2/');
            ruleApplied = 'QUERY_BETA_FLAG';
        }

        if (ruleApplied !== 'NONE') {
            console.log(`   [Dynamic Router] Rewrite [Rule: ${ruleApplied}] -> "${originalPath}" rewritten to "${rewrittenPath}"`);
        } else {
            console.log(`   [Dynamic Router] Forward -> "${originalPath}" routed without rewrite.`);
        }

        return {
            path: rewrittenPath,
            rule: ruleApplied
        };
    }
}
