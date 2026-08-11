import { FeatureStore } from './featureStore.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Feature Store Online & Offline Sync Validation   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const store = new FeatureStore();
    const entityId = 'Driver-Karan-99';

    console.log('🔵 Test 1: Ingesting parameters into low-latency online cache...');
    
    store.setOnlineFeature(entityId, 'avg_rating', 4.91);
    store.setOnlineFeature(entityId, 'total_trips_30d', 42);
    store.setOnlineFeature(entityId, 'acceptance_rate', 0.94);

    console.log('   ✅ Online features registered.');

    console.log('\n🔵 Test 2: Retrieving online features with real-time latency check...');
    
    const start = hrtimeMs();
    const features = store.getOnlineFeatures(entityId, ['avg_rating', 'total_trips_30d', 'acceptance_rate', 'non_existent_feature']);
    const latency = hrtimeMs() - start;

    console.log(`   📍 Retrieved features:`, features);
    console.log(`   📍 Online query latency: ${latency.toFixed(4)} ms`);

    const lookupOk = features.avg_rating === 4.91 && 
                     features.total_trips_30d === 42 && 
                     features.acceptance_rate === 0.94 &&
                     features.non_existent_feature === null;

    // Online lookup should be under 5ms (ordinarily <1ms in memory)
    const latencyOk = latency < 5.0;

    if (lookupOk && latencyOk) {
        console.log('   ✅ PASS: Feature values resolved correctly with sub-millisecond retrieval.');
    } else {
        console.error('   ❌ FAIL: Online lookup values mismatch or high query latency.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Asserting asynchronous offline data lake synchronization...');

    // Wait briefly for setImmediate to execute background sync tasks
    await delay(50);

    const offlineCount = store.getOfflineLogsCount(entityId);
    console.log(`   📍 Total offline sync log records: ${offlineCount}`);

    if (offlineCount === 3) {
        console.log('   ✅ PASS: Feature Store successfully synced logs to offline data lake.');
        console.log('\n🎉 SUCCESS: All Feature Store checks passed!');
    } else {
        console.error('   ❌ FAIL: Offline sync database mismatch.');
        process.exit(1);
    }
};

// Helper for high-resolution timing
function hrtimeMs() {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
}

runVerification();
