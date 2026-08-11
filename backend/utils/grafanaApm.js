/**
 * Grafana APM (Application Performance Monitoring) Agent Simulator
 * Tracks HTTP durations and computes p50, p90, and p99 latency percentiles.
 */

export class GrafanaApm {
    constructor() {
        this.requestCount = 0;
        this.errorCount = 0;
        this.latencies = [];
    }

    /**
     * Records transaction parameters for active requests
     */
    record(latencyMs, isError = false) {
        this.requestCount++;
        if (isError) {
            this.errorCount++;
        }
        this.latencies.push(latencyMs);
    }

    /**
     * Calculates mathematical percentile values from collected logs
     */
    calculatePercentile(percentile) {
        if (this.latencies.length === 0) return 0;
        
        // Sort latencies ascending
        const sorted = [...this.latencies].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Generates aggregated APM health metrics report
     */
    getStats() {
        const total = this.requestCount;
        const errorRate = total === 0 ? 0 : (this.errorCount / total) * 100;

        return {
            totalRequests: total,
            errorRatePercent: parseFloat(errorRate.toFixed(2)),
            p50Ms: this.calculatePercentile(50),
            p90Ms: this.calculatePercentile(90),
            p99Ms: this.calculatePercentile(99)
        };
    }
}
