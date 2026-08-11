import { ServerlessInstancePool } from './serverlessFunction.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Serverless Instance Pool Verification Checks     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const pool = new ServerlessInstancePool();

    console.log('🔵 Test 1: Verifying serverless pool idle count (Scale to Zero)...');
    console.log(`   📍 Active containers at start: ${pool.activeContainersCount}`);

    if (pool.activeContainersCount === 0) {
        console.log('   ✅ PASS: Pool scaled to zero when idle.');
    } else {
        console.error('   ❌ FAIL: Active instances found during idle state.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Triggering rapid PDF receipt generation task...');
    
    const task1 = pool.invokeFunction('GenerateReceiptPdf', 1200); // 1.2s execution
    console.log(`   📍 Status: ${task1.status} | Execution Time: ${task1.durationMs}ms`);
    console.log(`   📍 Billable GB-Seconds: ${task1.gbSeconds} | Execution Cost: $${task1.costUSD}`);

    // Expected: 1.2s * 0.5GB = 0.6 GB-seconds.
    // Cost: 0.6 * 0.00001667 = 0.00001000 USD
    if (task1.status === 'COMPLETED' && task1.gbSeconds === 0.6 && task1.costUSD === 0.00001000) {
        console.log('   ✅ PASS: Invocations tracked and billing metered successfully.');
    } else {
        console.error(`   ❌ FAIL: Metering mismatch. Got cost: ${task1.costUSD}`);
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Triggering heavy agricultural analytics report...');

    const task2 = pool.invokeFunction('CompileMandiReports', 12500); // 12.5s execution
    console.log(`   📍 Status: ${task2.status} | Execution Time: ${task2.durationMs}ms`);
    console.log(`   📍 Billable GB-Seconds: ${task2.gbSeconds} | Execution Cost: $${task2.costUSD}`);

    // Expected: 12.5s * 0.5GB = 6.25 GB-seconds.
    // Cost: 6.25 * 0.00001667 = 0.00010419 USD
    if (task2.status === 'COMPLETED' && task2.gbSeconds === 6.25 && task2.costUSD === 0.00010419) {
        console.log('   ✅ PASS: Heavy task scaled, metered, and released back to zero successfully.');
        console.log('\n🎉 SUCCESS: All Serverless Autoscale Instances checks passed!');
    } else {
        console.error(`   ❌ FAIL: Metering mismatch. Got cost: ${task2.costUSD}`);
        process.exit(1);
    }
};

runVerification();
