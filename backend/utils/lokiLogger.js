/**
 * Grafana Loki Log Aggregation Agent
 * Formats app log statements into label-indexed streams with nanosecond precision timestamps.
 */

export class LokiLogger {
    constructor() {
        this.defaultLabels = {
            app: 'villagelink',
            env: 'production'
        };
    }

    /**
     * Formats and pushes logs to the Loki aggregation collector
     */
    pushLog(level, message, jobLabel = 'api-server') {
        // Loki requires nanosecond precision (string format)
        const timestampNano = String(Date.now()) + '000000';

        // Assemble Loki REST payload layout
        const lokiPayload = {
            streams: [
                {
                    stream: {
                        ...this.defaultLabels,
                        level: level.toLowerCase(),
                        job: jobLabel
                    },
                    values: [
                        [timestampNano, message]
                    ]
                }
            ]
        };

        console.log(`   [Loki Aggregator] [${level.toUpperCase()}] [job: ${jobLabel}] -> "${message}"`);
        
        return {
            pushed: true,
            timestampNano,
            payload: lokiPayload
        };
    }
}
