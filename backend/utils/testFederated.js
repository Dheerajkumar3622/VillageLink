import { FederatedCoordinator, FederatedClientNode } from './federatedLearning.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Federated Averaging (FedAvg) Math Validation     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    // 1. Initialize central coordinator with base model weights
    const initialWeights = [0.5, 1.0];
    const coordinator = new FederatedCoordinator(initialWeights);

    // 2. Initialize 3 client nodes representing regional datasets with local biases
    const clientA = new FederatedClientNode('Mandi-Patna', 0.4);
    const clientB = new FederatedClientNode('Mandi-Buxar', -0.2);
    const clientC = new FederatedClientNode('Mandi-Arrah', 0.1);

    console.log('🔵 Test 1: Training local weights on separate edge nodes...');
    
    const weightsA = clientA.localTrain(initialWeights);
    const weightsB = clientB.localTrain(initialWeights);
    const weightsC = clientC.localTrain(initialWeights);

    // Expected Client updates calculations:
    // clientWeights = w + (w + localBias - w) * 0.15 = w + localBias * 0.15
    // ClientA [0]: 0.5 + 0.4*0.15 = 0.56 | [1]: 1.0 + 0.4*0.15 = 1.06
    // ClientB [0]: 0.5 - 0.2*0.15 = 0.47 | [1]: 1.0 - 0.2*0.15 = 0.97
    // ClientC [0]: 0.5 + 0.1*0.15 = 0.515 | [1]: 1.0 + 0.1*0.15 = 1.015

    console.log('\n🔵 Test 2: Submitting updates and performing Federated Averaging (FedAvg) aggregation...');

    coordinator.submitLocalUpdate(clientA.clientId, weightsA);
    coordinator.submitLocalUpdate(clientB.clientId, weightsB);
    coordinator.submitLocalUpdate(clientC.clientId, weightsC);

    const newGlobalWeights = coordinator.aggregateUpdates();

    // Expected FedAvg:
    // Avg[0] = (0.56 + 0.47 + 0.515) / 3 = 1.545 / 3 = 0.515
    // Avg[1] = (1.06 + 0.97 + 1.015) / 3 = 3.045 / 3 = 1.015
    
    console.log(`   📍 Aggregated Global Weights: [${newGlobalWeights.map(n => n.toFixed(4)).join(', ')}]`);

    const weight0Ok = Math.abs(newGlobalWeights[0] - 0.515) < 0.0001;
    const weight1Ok = Math.abs(newGlobalWeights[1] - 1.015) < 0.0001;

    if (weight0Ok && weight1Ok) {
        console.log('   ✅ PASS: Federated Averaging calculated correct parameter convergence without raw data transfer.');
        console.log('\n🎉 SUCCESS: All Federated Learning checks passed!');
    } else {
        console.error('   ❌ FAIL: Federated Averaging math mismatch.');
        process.exit(1);
    }
};

runVerification();
