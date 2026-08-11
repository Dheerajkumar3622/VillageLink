import { routeRequest } from './canaryRouter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Canary Deployments Version Routing Validation   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    console.log('🔵 Test 1: Testing routing distribution for 1000 simulated user sessions...');
    
    let stableCount = 0;
    let canaryCount = 0;
    const totalSimulations = 1000;
    const canaryWeight = 0.10; // Target: 10% canary traffic

    for (let i = 0; i < totalSimulations; i++) {
        const userId = `user-id-simulation-hash-${i}`;
        const route = routeRequest(userId, canaryWeight);
        if (route === 'CANARY_V2') {
            canaryCount++;
        } else {
            stableCount++;
        }
    }

    const canaryPercentage = (canaryCount / totalSimulations) * 100;
    console.log(`   📍 Stable (V1) count: ${stableCount}`);
    console.log(`   📍 Canary (V2) count: ${canaryCount} (${canaryPercentage.toFixed(2)}%)`);

    // Verify Canary distribution is within standard statistical bounds (e.g. 7% - 13%)
    const distOk = canaryPercentage >= 7 && canaryPercentage <= 13;
    if (distOk) {
        console.log(`   ✅ PASS: Canary routing distribution is within target deviation (7-13%).`);
    } else {
        console.error(`   ❌ FAIL: Route partition distribution skewed: ${canaryPercentage}%`);
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Checking session pinning determinism...');

    const sampleUserId = 'farmer-dev-session-pinning-test';
    const firstRoute = routeRequest(sampleUserId, canaryWeight);
    
    let pinnedOk = true;
    for (let i = 0; i < 10; i++) {
        const subsequentRoute = routeRequest(sampleUserId, canaryWeight);
        if (subsequentRoute !== firstRoute) {
            pinnedOk = false;
            break;
        }
    }

    console.log(`   📍 Sample User Route: ${firstRoute}`);
    console.log(`   📍 Session Pinning Stable: ${pinnedOk}`);

    if (pinnedOk) {
        console.log('   ✅ PASS: Client requests remain sticky to their matched version.');
        console.log('\n🎉 SUCCESS: All Canary Deployments routing checks passed!');
    } else {
        console.error('   ❌ FAIL: Version routing is non-deterministic.');
        process.exit(1);
    }
};

runVerification();
