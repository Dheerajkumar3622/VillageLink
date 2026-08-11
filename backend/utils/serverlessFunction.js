/**
 * Event-Driven Serverless Instance Pool Simulator
 * Tracks dynamically provisioned runner nodes and calculates metered compute utilization costs.
 */

export class ServerlessInstancePool {
    constructor() {
        this.allocatedMemoryGB = 0.5; // 512 MB instances
        this.ratePerGbSecond = 0.00001667; // $0.00001667 per GB-second
        this.activeContainersCount = 0;
    }

    /**
     * Trigger a mock serverless invocation with timing and billing computations
     */
    invokeFunction(functionName, taskDurationMs) {
        // Increment pool containers (simulating spin-up cold/warm containers)
        this.activeContainersCount++;
        console.log(`   [Serverless Engine] Scaled UP -> active containers: ${this.activeContainersCount} (Running: ${functionName})`);

        // Compute resource-seconds (Gigabyte-Seconds)
        const durationSeconds = taskDurationMs / 1000;
        const gbSeconds = durationSeconds * this.allocatedMemoryGB;
        const totalCostUSD = gbSeconds * this.ratePerGbSecond;

        // Simulate event completion and immediate release (Scale-to-zero model)
        this.activeContainersCount--;
        console.log(`   [Serverless Engine] Scaled DOWN -> released container. Active containers: ${this.activeContainersCount}`);

        return {
            functionName,
            status: 'COMPLETED',
            durationMs: taskDurationMs,
            gbSeconds,
            costUSD: parseFloat(totalCostUSD.toFixed(8))
        };
    }
}
