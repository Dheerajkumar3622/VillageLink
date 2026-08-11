import { insertMetric, queryTimeBuckets } from './timeSeriesDb.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Time Series Database downsampling Validation    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const METRIC_NAME = 'crop_potato_market_price';

const runTimeSeriesTests = () => {
    console.log('🔵 Phase 1: Recording chronological series data points...');

    // Minute 1: t = 1000, 2000
    insertMetric(METRIC_NAME, 20, 1000);
    insertMetric(METRIC_NAME, 22, 2000);

    // Minute 2: t = 61000, 62000
    insertMetric(METRIC_NAME, 28, 61000);
    insertMetric(METRIC_NAME, 32, 62000);

    // Minute 3: t = 121000
    insertMetric(METRIC_NAME, 25, 121000);

    console.log('   ✅ Metrics logged.');

    // --- TEST 1: DOWNSAMPLING INTO 1-MINUTE TIME BUCKETS (60000 ms) ---
    console.log('\n🔵 Test 1: Querying 1-minute downsampled time buckets...');
    
    const ONE_MINUTE = 60000;
    const buckets = queryTimeBuckets(METRIC_NAME, ONE_MINUTE);

    console.log(`   📍 Returned Buckets Count: ${buckets.length} (Expected: 3)`);
    buckets.forEach((b, i) => {
        console.log(`      [Bucket ${i + 1}]: Start Time: ${b.bucketStart} ms | Avg Value: ${b.average} | Count: ${b.count} | Min: ${b.min} | Max: ${b.max}`);
    });

    const test1Ok = buckets.length === 3 &&
                    buckets[0].bucketStart === 0 &&
                    buckets[0].average === 21 &&
                    buckets[1].bucketStart === 60000 &&
                    buckets[1].average === 30 &&
                    buckets[2].bucketStart === 120000 &&
                    buckets[2].average === 25;

    if (test1Ok) {
        console.log('   ✅ PASS: Downsampling average calculations completed accurately.');
    } else {
        console.error('   ❌ FAIL: Downsampling average calculations mismatch.');
        process.exit(1);
    }

    // --- TEST 2: MIN/MAX BOUNDARIES WITHIN BUCKETS ---
    console.log('\n🔵 Test 2: Verifying min/max range boundaries inside buckets...');
    const test2Ok = buckets[0].min === 20 && buckets[0].max === 22 &&
                    buckets[1].min === 28 && buckets[1].max === 32;

    if (test2Ok) {
        console.log('   ✅ PASS: Min and Max boundary records resolved successfully.');
    } else {
        console.error('   ❌ FAIL: Min or Max boundary mismatch.');
        process.exit(1);
    }

    if (test1Ok && test2Ok) {
        console.log('\n🎉 SUCCESS: All Time Series hypertable downsampling tests passed!');
    } else {
        console.error('\n❌ FAILURE: Time Series DB validation failed.');
        process.exit(1);
    }
};

runTimeSeriesTests();
