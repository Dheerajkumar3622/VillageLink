import { GrafanaApm } from './grafanaApm.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Grafana APM Response Latency Percentiles Test   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const apm = new GrafanaApm();

    console.log('🔵 Test 1: Ingesting transaction telemetry latencies and errors...');
    
    // Ingest 10 mock request latencies
    // Sorted array: [40, 45, 52, 58, 65, 80, 120, 250, 480, 950]
    apm.record(40, false);
    apm.record(45, false);
    apm.record(52, false);
    apm.record(58, false);
    apm.record(65, false);
    apm.record(80, false);
    apm.record(120, false);
    apm.record(250, true); // 1st error
    apm.record(480, false);
    apm.record(950, true); // 2nd error

    const stats = apm.getStats();
    console.log('   📍 Collected APM Metrics:', JSON.stringify(stats, null, 2));

    if (stats.totalRequests === 10 && stats.errorRatePercent === 20) {
        console.log('   ✅ PASS: Transaction counters and error rates calculated correctly.');
    } else {
        console.error('   ❌ FAIL: Statistics count mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Validating percentile calculations (p50, p90, p99)...');

    // p50 index: ceil(0.50 * 10) - 1 = 4 -> 65ms
    // p90 index: ceil(0.90 * 10) - 1 = 8 -> 480ms
    // p99 index: ceil(0.99 * 10) - 1 = 9 -> 950ms
    console.log(`   📍 Calculated p50: ${stats.p50Ms}ms`);
    console.log(`   📍 Calculated p90: ${stats.p90Ms}ms`);
    console.log(`   📍 Calculated p99: ${stats.p99Ms}ms`);

    if (stats.p50Ms === 65 && stats.p90Ms === 480 && stats.p99Ms === 950) {
        console.log('   ✅ PASS: Latency percentile bounds matched Lucene sorting formulas.');
        console.log('\n🎉 SUCCESS: All Grafana APM Metrics checks passed!');
    } else {
        console.error('   ❌ FAIL: Percentile calculation value mismatch.');
        process.exit(1);
    }
};

runVerification();
