import { writeLocalRecord, queryLocalRecord, clearRegionalStores } from './activeActiveReplication.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        Multi-Region Active-Active Replication Validation       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    clearRegionalStores();
    const testKey = 'mandi_price_potato';

    // --- TEST 1: REPLICATION FROM EAST TO WEST ---
    console.log('🔵 Test 1: Writing local record to region [East] and validating sync...');
    
    // Write in East at t=1000
    writeLocalRecord('East', testKey, { price: 22, location: 'Sasaram' }, 1000);

    const valEast = queryLocalRecord('East', testKey);
    const valWest = queryLocalRecord('West', testKey);

    console.log(`   📍 East Region Price: ${valEast ? valEast.value.price : 'Null'}`);
    console.log(`   📍 West Region Price (synchronized): ${valWest ? valWest.value.price : 'Null'}`);

    const test1Ok = valEast && valWest && valEast.value.price === 22 && valWest.value.price === 22;
    if (test1Ok) {
        console.log('   ✅ PASS: Local write replicated to peer region successfully.');
    } else {
        console.error('   ❌ FAIL: Replication sync failed between nodes.');
        process.exit(1);
    }

    // --- TEST 2: CONFLICT RESOLUTION LWW (LAST-WRITE-WINS) ---
    console.log('\n🔵 Test 2: Simulating out-of-order updates (LWW Conflict Resolution)...');

    // Newer update from West (t=3000)
    console.log('   👉 Write to West with newer timestamp (t=3000): price=28');
    writeLocalRecord('West', testKey, { price: 28, location: 'Dehri' }, 3000);

    // Older update from East (t=2000) that arrived out of order
    console.log('   👉 Write to East with older timestamp (t=2000): price=25');
    writeLocalRecord('East', testKey, { price: 25, location: 'Ara' }, 2000);

    // Fetch states
    const finalEast = queryLocalRecord('East', testKey);
    const finalWest = queryLocalRecord('West', testKey);

    console.log(`   📍 Final East Region Price: ${finalEast ? finalEast.value.price : 'Null'} (Expected: 28)`);
    console.log(`   📍 Final West Region Price: ${finalWest ? finalWest.value.price : 'Null'} (Expected: 28)`);

    const test2Ok = finalEast && finalWest && finalEast.value.price === 28 && finalWest.value.price === 28;
    if (test2Ok) {
        console.log('   ✅ PASS: Last-Write-Wins resolved updates, ensuring global consistency.');
        console.log('\n🎉 SUCCESS: All Active-Active replication tests passed successfully!');
    } else {
        console.error('   ❌ FAIL: Eventual consistency breached or conflict resolution incorrect.');
        process.exit(1);
    }
};

runVerification().catch(err => console.error(err));
