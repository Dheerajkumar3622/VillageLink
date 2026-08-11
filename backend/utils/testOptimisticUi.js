import { applyOptimisticUpdate, getOptimisticState, setOptimisticState } from './optimisticUi.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           Optimistic UI & Automatic Rollback Validation        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    // Reset state values
    setOptimisticState('cropPrice', 100);
    setOptimisticState('bookedSeats', 5);

    // --- TEST 1: SUCCESSFUL COMMIT ---
    console.log('🔵 Test 1: Simulating successful optimistic update (commit)...');
    
    // Server task resolver that succeeds in 100ms
    const successfulSyncTask = new Promise((resolve) => setTimeout(() => resolve('OK'), 100));

    const commitPromise = applyOptimisticUpdate('cropPrice', 120, successfulSyncTask);

    // Assert that client state updated immediately (optimistic UI)
    const immediateVal = getOptimisticState('cropPrice');
    console.log(`   📍 Immediate local state value (pre-sync): ${immediateVal} (Expected: 120)`);

    const resultCommit = await commitPromise;
    const finalVal = getOptimisticState('cropPrice');
    console.log(`   📍 Final local state value (post-sync): ${finalVal} (Expected: 120)`);

    const test1Ok = immediateVal === 120 && finalVal === 120 && resultCommit.success && !resultCommit.rolledBack;
    if (test1Ok) {
        console.log('   ✅ PASS: State successfully committed after server confirmation.');
    } else {
        console.error('   ❌ FAIL: Optimistic state commit validation failed.');
        process.exit(1);
    }

    // --- TEST 2: FAILED OPTIMISTIC ROLLBACK ---
    console.log('\n🔵 Test 2: Simulating failed sync task (automatic rollback)...');

    // Server task resolver that fails in 100ms
    const failedSyncTask = new Promise((_, reject) => setTimeout(() => reject(new Error('Seat reservation limit exceeded')), 100));

    const rollbackPromise = applyOptimisticUpdate('bookedSeats', 8, failedSyncTask);

    // Assert that client state updated immediately (optimistic UI)
    const immediateSeats = getOptimisticState('bookedSeats');
    console.log(`   📍 Immediate local state value (pre-sync): ${immediateSeats} (Expected: 8)`);

    const resultRollback = await rollbackPromise;
    const finalSeats = getOptimisticState('bookedSeats');
    console.log(`   📍 Final local state value (post-sync): ${finalSeats} (Expected: 5 due to Rollback)`);

    const test2Ok = immediateSeats === 8 && finalSeats === 5 && !resultRollback.success && resultRollback.rolledBack;
    if (test2Ok) {
        console.log('   ✅ PASS: State successfully rolled back to snapshot on server error.');
        console.log('\n🎉 SUCCESS: All Optimistic UI rollback validations passed!');
    } else {
        console.error('   ❌ FAIL: Optimistic state rollback validation failed.');
        process.exit(1);
    }
};

runVerification().catch(err => console.error(err));
