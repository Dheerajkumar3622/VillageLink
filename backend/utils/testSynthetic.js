import { SyntheticMonitor } from './syntheticMonitor.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Synthetic User Monitoring SLA verification      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const monitor = new SyntheticMonitor();

    console.log('🔵 Test 1: Simulating healthy login transaction flow (Status 200)...');
    
    const mockLoginSuccess = () => {
        // Fast response, HTTP 200
        return { statusCode: 200, token: 'session_8923a' };
    };

    const res1 = monitor.runScenario('UserLoginFlow', mockLoginSuccess);
    console.log(`   📍 Passed SLA: ${res1.passed} | Latency: ${res1.latencyMs}ms | Code: ${res1.statusCode}`);

    if (res1.passed && res1.statusCode === 200) {
        console.log('   ✅ PASS: Healthy login scenario executed inside metric limits.');
    } else {
        console.error('   ❌ FAIL: Successful login scenario rejected by monitor.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating booking API transaction failure (Status 500)...');

    const mockBookingFailure = () => {
        // HTTP 500 internal server error
        return { statusCode: 500, message: 'Database query timeout.' };
    };

    const res2 = monitor.runScenario('SubmitBookingTransaction', mockBookingFailure);
    console.log(`   📍 Passed SLA: ${res2.passed} | Code: ${res2.statusCode} | Error Code: ${res2.error}`);

    if (!res2.passed && res2.statusCode === 500 && res2.error === 'HTTP_500') {
        console.log('   ✅ PASS: API server error caught and flagged by synthetic checker.');
    } else {
        console.error('   ❌ FAIL: Server error bypassed synthetic test.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating network latency SLA threshold breach...');

    const mockSlowListingFetch = () => {
        // Introduce deliberate delay exceeding 500ms SLA limit
        const limit = Date.now() + 550;
        while (Date.now() < limit) {}
        return { statusCode: 200, cropsCount: 15 };
    };

    const res3 = monitor.runScenario('GetCropsListing', mockSlowListingFetch);
    console.log(`   📍 Passed SLA: ${res3.passed} | Latency: ${res3.latencyMs}ms | Error Code: ${res3.error}`);

    if (!res3.passed && res3.latencyMs >= 500 && res3.error.includes('LATENCY_SLA_BREACH')) {
        console.log('   ✅ PASS: Endpoint response delay flagged successfully by synthetic SLA rules.');
        console.log('\n🎉 SUCCESS: All Synthetic User Monitoring checks passed!');
    } else {
        console.error('   ❌ FAIL: Latency SLA violation bypassed synthetic check.');
        process.exit(1);
    }
};

runVerification();
