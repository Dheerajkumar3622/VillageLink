/**
 * Federated Learning Coordinator & Node Simulator
 * Implements Federated Averaging (FedAvg) to compile model weight parameters.
 * Retains raw training data on client nodes to protect privacy.
 */

export class FederatedClientNode {
    constructor(clientId, localBias = 0.0) {
        this.clientId = clientId;
        // Local parameter bias shift representing diverse geographical datasets
        this.localBias = localBias;
    }

    /**
     * Simulates local training by adjusting incoming global parameters with local data features
     * @param {Array<number>} globalWeights Array of model coefficients
     */
    localTrain(globalWeights) {
        // Adjust parameters to minimize loss against local biases
        const localWeights = globalWeights.map(w => {
            // Gradient step towards local bias target
            const target = w + this.localBias;
            const step = (target - w) * 0.15; // Learning rate coefficient
            return w + step;
        });

        console.log(`   [ClientNode:${this.clientId}] Local training completed. Weights: [${localWeights.map(n => n.toFixed(3)).join(', ')}]`);
        return localWeights;
    }
}

export class FederatedCoordinator {
    constructor(initialWeights = [0.5, -0.2, 0.8]) {
        this.globalWeights = [...initialWeights];
        this.updatesPool = [];
    }

    /**
     * Collects weight parameter updates from client nodes
     */
    submitLocalUpdate(clientId, weightUpdate) {
        this.updatesPool.push({
            clientId,
            weights: weightUpdate
        });
    }

    /**
     * Implements Federated Averaging (FedAvg) to compute global weights
     */
    aggregateUpdates() {
        if (this.updatesPool.length === 0) {
            return this.globalWeights;
        }

        const numUpdates = this.updatesPool.length;
        const numWeights = this.globalWeights.length;

        // Initialize sum array
        const sums = Array(numWeights).fill(0);

        // Sum parameters coordinate-wise
        this.updatesPool.forEach(update => {
            for (let i = 0; i < numWeights; i++) {
                sums[i] += update.weights[i];
            }
        });

        // Compute coordinate average (FedAvg)
        this.globalWeights = sums.map(sum => sum / numUpdates);
        
        // Reset pool
        this.updatesPool = [];

        console.log(`   [Coordinator] FedAvg completed. New Global Weights: [${this.globalWeights.map(n => n.toFixed(3)).join(', ')}]`);
        return this.globalWeights;
    }

    getGlobalWeights() {
        return this.globalWeights;
    }
}
