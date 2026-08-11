import { config, injectChaos } from './chaosMonkey.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Chaos Engineering Chaos Monkey Validation        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    // Action task representation
    const sampleTask = async () => 'TASK_COMPLETED';

    console.log('🔵 Phase 1: Running baseline execution with chaos disabled...');
    
    config.enabled = false;
    const startBase = Date.now();
    const resBase = await injectChaos(sampleTask);
    const durationBase = Date.now() - startBase;

    console.log(`   📍 Outcome: ${resBase} | Duration: ${durationBase}ms`);
    
    const baseOk = resBase === 'TASK_COMPLETED' && durationBase < 10;
    if (baseOk) {
        console.log('   ✅ PASS: Clean baseline task execution succeeded.');
    } else {
        console.error('   ❌ FAIL: Baseline execution failed.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Activating Chaos Monkey (20% failure rate, 40-80ms delay)...');
    
    config.enabled = true;
    config.errorRate = 0.20;
    config.minLatencyMs = 40;
    config.maxLatencyMs = 80;

    let successCount = 0;
    let failureCount = 0;
    let highLatencyCount = 0;
    const totalRuns = 50;

    for (let i = 0; i < totalRuns; i++) {
        const startRun = Date.now();
        try {
            const res = await injectChaos(sampleTask);
            const duration = Date.now() - startRun;
            successCount++;
            if (duration >= 35) { // Account for scheduler overhead
                highLatencyCount++;
            }
        } catch (err) {
            failureCount++;
        }
    }

    const failurePercentage = (failureCount / totalRuns) * 100;
    console.log(`   📍 Total Runs: ${totalRuns}`);
    console.log(`   📍 Successes: ${successCount}`);
    console.log(`   📍 Failures: ${failureCount} (${failurePercentage.toFixed(2)}%)`);
    console.log(`   📍 High-Latency (>=40ms) Successes: ${highLatencyCount}`);

    const failureRateOk = failureCount > 0 && failureCount < totalRuns;
    const latencyJitterOk = highLatencyCount === successCount;

    if (failureRateOk && latencyJitterOk) {
        console.log('   ✅ PASS: Chaos monkey injected random exceptions and delays successfully.');
        console.log('\n🎉 SUCCESS: All Chaos Engineering assertions passed!');
    } else {
        console.error('   ❌ FAIL: Chaos monkey failure rate or delay distribution mismatched.');
        process.exit(1);
    }
};

runVerification();
