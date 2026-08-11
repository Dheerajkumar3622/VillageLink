import { ArgoCdSimulator } from './argocdSimulator.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               ArgoCD GitOps Sync and Drift Verification Checks ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const argocd = new ArgoCdSimulator();

    // Desired state committed to Git source of truth
    const gitDesiredState = {
        replicas: 2,
        imageTag: 'villagelink-backend:v1.0.0',
        ingressRoute: '/api/v1'
    };

    // Case 1: Live cluster matches git repository (Synced)
    const matchingLiveState = {
        replicas: 2,
        imageTag: 'villagelink-backend:v1.0.0',
        ingressRoute: '/api/v1'
    };

    // Case 2: Live cluster deviated manually (OutOfSync)
    const driftedLiveState = {
        replicas: 5, // manual CLI override
        imageTag: 'villagelink-backend:v1.0.0',
        ingressRoute: '/api/v1'
    };

    console.log('🔵 Test 1: Evaluating status for a synchronized GitOps deployment...');
    
    const res1 = argocd.checkSyncStatus(gitDesiredState, matchingLiveState);
    console.log(`   📍 Synced: ${res1.synced} | Status Code: ${res1.status}`);

    if (res1.synced && res1.status === 'Synced') {
        console.log('   ✅ PASS: Valid deployment mapped as Synced successfully.');
    } else {
        console.error('   ❌ FAIL: Synchronized state flagged as out of sync.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Detecting manual configuration drift changes...');

    const res2 = argocd.checkSyncStatus(gitDesiredState, driftedLiveState);
    console.log(`   📍 Synced: ${res2.synced} | Status Code: ${res2.status} | Drifted Properties: [${res2.driftedProperties.join(', ')}]`);

    if (!res2.synced && res2.status === 'OutOfSync' && res2.driftedProperties.includes('replicas')) {
        console.log('   ✅ PASS: Manual configuration modifications flagged successfully.');
    } else {
        console.error('   ❌ FAIL: Config drift bypassed ArgoCD detection.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Restoring desired state via automated self-healing overrides...');

    const healResult = argocd.autoHealState(gitDesiredState, driftedLiveState);
    console.log(`   📍 Healed: ${healResult.healed} | Target Status: ${healResult.status}`);
    console.log(`   📍 Restored Live replicas: ${healResult.state.replicas} (Desired: ${gitDesiredState.replicas})`);

    if (healResult.healed && healResult.status === 'Synced' && healResult.state.replicas === 2) {
        console.log('   ✅ PASS: ArgoCD successfully rolled back drifted attributes to match repository.');
        console.log('\n🎉 SUCCESS: All GitOps CD pipelines checks passed!');
    } else {
        console.error('   ❌ FAIL: Self-healing failed to sync resource configuration.');
        process.exit(1);
    }
};

runVerification();
