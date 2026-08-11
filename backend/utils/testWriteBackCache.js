import { writeBackCacheSet, writeBackCacheGet, flushDirtyCache, getDirtyKeysCount, mockDatabaseStore } from './writeBackCache.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Write-Back Cache Validation Suite                ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    const key1 = 'driver_pos_3002';
    const val1 = { lat: 25.094, lng: 84.015, speed: 45 };
    const key2 = 'driver_pos_3003';
    const val2 = { lat: 25.101, lng: 84.020, speed: 50 };

    console.log('🔵 Phase 1: Writing data to Write-Back Cache...');
    const res1 = writeBackCacheSet(key1, val1);
    const res2 = writeBackCacheSet(key2, val2);

    console.log(`   📍 Write 1 Status: ${res1.status}`);
    console.log(`   📍 Write 2 Status: ${res2.status}`);
    console.log(`   📍 Dirty keys count: ${getDirtyKeysCount()} (Expected: 2)`);

    // Verify values are in cache (fast read path)
    const cachedVal1 = writeBackCacheGet(key1);
    console.log(`   📍 Read from cache path: Lat=${cachedVal1 ? cachedVal1.lat : 'Null'}`);

    // Verify database does NOT have them yet (deferred persist)
    const dbVal1 = mockDatabaseStore.get(key1);
    console.log(`   📍 Read from DB path (pre-flush): ${dbVal1 ? 'Found' : 'Not Found (Correct)'}`);

    if (getDirtyKeysCount() === 2 && !dbVal1) {
        console.log('   ✅ PASS: Cache intercepted writes and deferred persistent storage.');
    } else {
        console.error('   ❌ FAIL: Write-Back cache state invalid before flush.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Simulating scheduled background flush...');
    flushDirtyCache();

    console.log(`   📍 Dirty keys count after flush: ${getDirtyKeysCount()} (Expected: 0)`);
    
    // Verify values are now persisted
    const dbVal1Post = mockDatabaseStore.get(key1);
    const dbVal2Post = mockDatabaseStore.get(key2);

    console.log(`   📍 DB Key 1 Value: ${dbVal1Post ? `Lat=${dbVal1Post.lat}, Lng=${dbVal1Post.lng}` : 'Null'}`);
    console.log(`   📍 DB Key 2 Value: ${dbVal2Post ? `Lat=${dbVal2Post.lat}, Lng=${dbVal2Post.lng}` : 'Null'}`);

    if (getDirtyKeysCount() === 0 && dbVal1Post && dbVal2Post && dbVal1Post.lat === 25.094) {
        console.log('   ✅ PASS: Data successfully synchronized to database. Cache is now clean.');
        console.log('\n🎉 SUCCESS: All Write-Back caching validations passed!');
    } else {
        console.error('   ❌ FAIL: Data synchronization mismatch during flush.');
        process.exit(1);
    }
};

runVerification().catch(err => console.error(err));
