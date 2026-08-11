import { captureMutation, downstreamSearchCache, getCdcEventLog } from './cdcProcessor.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Change Data Capture (CDC) Validation Suite        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const DOC_ID = 'booking_arrah_3021';

const runCdcTests = () => {
    // --- TEST 1: INSERT OPERATION ---
    console.log('\n🔵 Test 1: Simulating DB Insert transaction...');
    const insertDelta = {
        routeFrom: 'Arrah Mandi',
        routeTo: 'Kolkata Depot',
        fare: 12000,
        status: 'PENDING'
    };
    
    captureMutation('INSERT', 'bookings', DOC_ID, insertDelta);
    
    const replicaDoc1 = downstreamSearchCache.get(DOC_ID);
    console.log('   📍 Replica State after INSERT:');
    console.log(`      Route: ${replicaDoc1 ? replicaDoc1.routeFrom : 'Null'} -> ${replicaDoc1 ? replicaDoc1.routeTo : 'Null'}`);
    console.log(`      Fare:  ${replicaDoc1 ? replicaDoc1.fare : 'Null'}`);
    console.log(`      Status: ${replicaDoc1 ? replicaDoc1.status : 'Null'}`);

    const test1Ok = replicaDoc1 && replicaDoc1.fare === 12000 && replicaDoc1.routeFrom === 'Arrah Mandi';
    if (test1Ok) {
        console.log('   ✅ PASS: Insert mutation captured and replicated downstream.');
    } else {
        console.error('   ❌ FAIL: Replicated document mismatch after insert.');
    }

    // --- TEST 2: UPDATE OPERATION ---
    console.log('\n🔵 Test 2: Simulating DB Update transaction...');
    const updateDelta = {
        status: 'ALLOCATED',
        driverId: 'drv_sasaram_8110'
    };

    captureMutation('UPDATE', 'bookings', DOC_ID, updateDelta);

    const replicaDoc2 = downstreamSearchCache.get(DOC_ID);
    console.log('   📍 Replica State after UPDATE:');
    console.log(`      Route:  ${replicaDoc2 ? replicaDoc2.routeFrom : 'Null'}`); // Should still exist
    console.log(`      Status: ${replicaDoc2 ? replicaDoc2.status : 'Null'}`); // Should be updated
    console.log(`      Driver: ${replicaDoc2 ? replicaDoc2.driverId : 'Null'}`); // Should be added

    const test2Ok = replicaDoc2 && replicaDoc2.status === 'ALLOCATED' && replicaDoc2.routeFrom === 'Arrah Mandi' && replicaDoc2.driverId === 'drv_sasaram_8110';
    if (test2Ok) {
        console.log('   ✅ PASS: Update mutation captured and merged downstream.');
    } else {
        console.error('   ❌ FAIL: Replicated document update mismatch.');
    }

    // --- TEST 3: DELETE OPERATION ---
    console.log('\n🔵 Test 3: Simulating DB Delete transaction...');
    captureMutation('DELETE', 'bookings', DOC_ID);

    const replicaDoc3 = downstreamSearchCache.get(DOC_ID);
    console.log(`   📍 Replica exists in downstream cache? ${replicaDoc3 ? 'Yes' : 'No'}`);

    const test3Ok = !replicaDoc3;
    if (test3Ok) {
        console.log('   ✅ PASS: Delete mutation captured and purged from replica.');
    } else {
        console.error('   ❌ FAIL: Document was not deleted from replica.');
    }

    // Check transaction counts in event history log
    const eventLog = getCdcEventLog();
    const test4Ok = eventLog.length === 3;
    console.log(`\n📝 Total captured events in CDC log: ${eventLog.length}`);

    if (test1Ok && test2Ok && test3Ok && test4Ok) {
        console.log('\n🎉 SUCCESS: All Change Data Capture (CDC) replication tests passed!');
    } else {
        console.error('\n❌ FAILURE: CDC verification checks failed.');
        process.exit(1);
    }
};

runCdcTests();
