import { Redlock } from './redlock.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Redlock Distributed Locking Algorithm Test       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const dlock = new Redlock();
    const resource = 'vehicle_seat_reservation_109';

    console.log('🔵 Test 1: Acquiring lock from Client Alpha (Should succeed)...');
    
    const acquired1 = dlock.acquire(resource, 'client-token-alpha', 10000);
    console.log(`   📍 Alpha Lock Acquisition Status: ${acquired1}`);

    if (acquired1 === true) {
        console.log('   ✅ PASS: Lock acquired on cluster quorum successfully.');
    } else {
        console.error('   ❌ FAIL: Lock acquisition rejected.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Attempting concurrent lock acquisition from Client Beta (Should fail)...');

    const acquired2 = dlock.acquire(resource, 'client-token-beta', 10000);
    console.log(`   📍 Beta Lock Acquisition Status: ${acquired2}`);

    if (acquired2 === false) {
        console.log('   ✅ PASS: Mutual exclusion confirmed. Client Beta blocked.');
    } else {
        console.error('   ❌ FAIL: Mutual exclusion breached. Lock double-allocated.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Releasing lock from Client Alpha and re-acquiring by Client Beta...');

    const releaseRes = dlock.release(resource, 'client-token-alpha');
    console.log(`   📍 Nodes cleared on release: ${releaseRes.releasedNodesCount}/5`);

    const acquired3 = dlock.acquire(resource, 'client-token-beta', 10000);
    console.log(`   📍 Beta Lock Re-Acquisition Status: ${acquired3}`);

    if (acquired3 === true && releaseRes.releasedNodesCount >= 3) {
        console.log('   ✅ PASS: Lock safely released and allocated to waiting client.');
    } else {
        console.error('   ❌ FAIL: Lock release or transfer failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Testing quorum failure with 3 offline Redis instances...');

    // Release current lock
    dlock.release(resource, 'client-token-beta');

    // Shutdown 3 nodes out of 5
    dlock.setNodeStatus(0, false);
    dlock.setNodeStatus(1, false);
    dlock.setNodeStatus(2, false);

    const acquired4 = dlock.acquire('new_mandi_parcel_99', 'client-token-gamma', 10000);
    console.log(`   📍 Gamma Lock Acquisition Status: ${acquired4}`);

    if (acquired4 === false) {
        console.log('   ✅ PASS: Fault tolerance handled. Lock rejected when quorum size is unreachable.');
        console.log('\n🎉 SUCCESS: All Distributed Locking (Redlock) checks passed!');
    } else {
        console.error('   ❌ FAIL: Lock granted despite lack of cluster quorum.');
        process.exit(1);
    }
};

runVerification();
