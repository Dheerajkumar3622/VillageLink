/**
 * Prometheus Alertmanager Threshold Simulator
 * Validates system performance metrics against YAML rules and dispatches notifications.
 */

export class PrometheusAlertManager {
    constructor() {
        this.alertRules = [];
    }

    /**
     * Parses alerts rules from yaml group structures
     */
    loadRules(yamlRulesContent) {
        // Find Alert statements using basic string scanning
        const alertBlockRegex = /alert:\s*(\w+)/g;
        let match;
        
        while ((match = alertBlockRegex.exec(yamlRulesContent)) !== null) {
            this.alertRules.push(match[1]);
        }
    }

    /**
     * Inspects active operational telemetry and flags rules violations
     */
    evaluateMetrics(liveMetrics) {
        const activeAlerts = [];

        // Check Rule: APIHighLatency (http_request_duration_seconds > 2)
        if (liveMetrics.http_request_duration_seconds !== undefined && liveMetrics.http_request_duration_seconds > 2) {
            activeAlerts.push({
                alert: 'APIHighLatency',
                severity: 'warning',
                value: `${liveMetrics.http_request_duration_seconds}s`,
                summary: 'High API response duration detected'
            });
        }

        // Check Rule: DatabaseConnectionFailure (mongodb_connected_status == 0)
        if (liveMetrics.mongodb_connected_status !== undefined && liveMetrics.mongodb_connected_status === 0) {
            activeAlerts.push({
                alert: 'DatabaseConnectionFailure',
                severity: 'critical',
                value: 'disconnected',
                summary: 'Database instance disconnected'
            });
        }

        let notificationSent = false;
        if (activeAlerts.length > 0) {
            notificationSent = true;
            console.log(`   [Alertmanager] Firing ${activeAlerts.length} active alerts. Dispatching notifications...`);
            for (const alertInfo of activeAlerts) {
                console.log(`   🚨 [${alertInfo.severity.toUpperCase()}] Alert: ${alertInfo.alert} (Value: ${alertInfo.value}) - Summary: ${alertInfo.summary}`);
            }
        } else {
            console.log('   [Alertmanager] Clean metrics check. 0 alerts firing.');
        }

        return {
            alertsFiring: activeAlerts,
            notificationSent
        };
    }
}
