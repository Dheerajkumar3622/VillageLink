import { executeDistributedTransaction, setNodeOnlineStatus, getReplicaValue } from './newSqlManager.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           NewSQL Two-Phase Commit (2PC) Validation Suite       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const TEST_KEY = 'usr_balance_farmer_3002';

const runVerificationTests = () => {
    // --- SCENARIO 1: SUCCESSFUL TRANSACTION (ALL NODES ONLINE) ---
    console.log('\n🟢 Scenario 1: All Nodes Online (Happy Path Commit)');
    const tx1 = executeDistributedTransaction('tx_1001', TEST_KEY, '5000');
    
    // Verify replication across all nodes
    const valDelhi = getReplicaValue('DELHI', TEST_KEY);
    const valMumbai = getReplicaValue('MUMBAI', TEST_KEY);
    const valKolkata = getReplicaValue('KOLKATA', TEST_KEY);

    console.log('\n📊 Replicated Store State:');
    console.log(`   Delhi Node:   "${valDelhi}"`);
    console.log(`   Mumbai Node:  "${valMumbai}"`);
    console.log(`   Kolkata Node: "${valKolkata}"`);

    const scenario1Ok = tx1.success && valDelhi === '5000' && valMumbai === '5000' && valKolkata === '5000';
    if (scenario1Ok) {
        console.log('   ✅ PASS: Transaction committed and replicated to all nodes successfully.');
    } else {
        console.error('   ❌ FAIL: Replication or commit check failed!');
    }

    // --- SCENARIO 2: ABORTED TRANSACTION & ROLLBACK (ONE NODE OFFLINE) ---
    console.log('\n🟢 Scenario 2: Kolkata Node Goes Offline (Prepare Failure & Rollback)');
    
    // Simulate disaster (Kolkata node disconnected)
    setNodeOnlineStatus('KOLKATA', false);
    
    // Attempt write transaction
    const tx2 = executeDistributedTransaction('tx_1002', TEST_KEY, '9999');

    // Verify rollback isolation
    const valDelhi2 = getReplicaValue('DELHI', TEST_KEY);
    const valMumbai2 = getReplicaValue('MUMBAI', TEST_KEY);
    const valKolkata2 = getReplicaValue('KOLKATA', TEST_KEY);

    console.log('\n📊 Replicated Store State (After Rollback):');
    console.log(`   Delhi Node:   "${valDelhi2}" (Should remain at "5000")`);
    console.log(`   Mumbai Node:  "${valMumbai2}" (Should remain at "5000")`);
    console.log(`   Kolkata Node: "${valKolkata2}" (Offline, no update)`);

    const scenario2Ok = !tx2.success && valDelhi2 === '5000' && valMumbai2 === '5000';
    if (scenario2Ok) {
        console.log('   ✅ PASS: Transaction was successfully aborted and rolled back. Data consistency preserved!');
    } else {
        console.error('   ❌ FAIL: Rollback failed! Inconsistent data detected.');
    }

    if (scenario1Ok && scenario2Ok) {
        console.log('\n🎉 SUCCESS: All NewSQL Two-Phase Commit consistency checks passed!');
    } else {
        console.error('\n❌ FAILURE: NewSQL transactional integrity checks failed.');
        process.exit(1);
    }
};

runVerificationTests();
