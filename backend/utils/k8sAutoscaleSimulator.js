/**
 * Kubernetes Horizontal Pod Autoscaler (HPA) Evaluation Loop Simulator
 * Recalculates replica counts based on target CPU metrics matching manifest declarations.
 */

export class K8sAutoscaleSimulator {
    constructor() {
        this.minReplicas = 2;
        this.maxReplicas = 10;
        this.targetCPUUtilization = 70; // 70% target CPU utilization
    }

    /**
     * Parses simple YAML values matching mock manifest keys
     */
    loadManifestSettings(yamlContent) {
        // Mock parsing simple key-value targets from manifest content
        const minMatch = yamlContent.match(/minReplicas:\s*(\d+)/i);
        const maxMatch = yamlContent.match(/maxReplicas:\s*(\d+)/i);
        const targetCpuMatch = yamlContent.match(/targetCPUUtilizationPercentage:\s*(\d+)/i);

        if (minMatch) this.minReplicas = parseInt(minMatch[1], 10);
        if (maxMatch) this.maxReplicas = parseInt(maxMatch[1], 10);
        if (targetCpuMatch) this.targetCPUUtilization = parseInt(targetCpuMatch[1], 10);
    }

    /**
     * Calculates the desired number of pod instances based on target load utilization
     * Formula: desiredReplicas = ceil(currentReplicas * (currentMetricValue / targetValue))
     */
    evaluateScale(currentCPU, currentReplicas) {
        // Calculate desired replicas using official Kubernetes HPA formula
        let desiredReplicas = Math.ceil(currentReplicas * (currentCPU / this.targetCPUUtilization));

        // Enforce replica boundaries [minReplicas, maxReplicas]
        desiredReplicas = Math.max(this.minReplicas, Math.min(this.maxReplicas, desiredReplicas));

        let action = 'NO_CHANGE';
        if (desiredReplicas > currentReplicas) {
            action = 'SCALE_UP';
            console.log(`   [k8s HPA] CPU: ${currentCPU}% -> scaling UP: ${currentReplicas} -> ${desiredReplicas} pods.`);
        } else if (desiredReplicas < currentReplicas) {
            action = 'SCALE_DOWN';
            console.log(`   [k8s HPA] CPU: ${currentCPU}% -> scaling DOWN: ${currentReplicas} -> ${desiredReplicas} pods.`);
        } else {
            console.log(`   [k8s HPA] CPU: ${currentCPU}% -> replica count stable at ${currentReplicas} pods.`);
        }

        return {
            action,
            replicas: desiredReplicas,
            cpu: currentCPU
        };
    }
}
