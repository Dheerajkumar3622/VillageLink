import { createPool, executeTask, getPoolStatus } from './bulkhead.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Bulkhead Isolation Concurrency Validation        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    // 1. Create a bulkhead pool for "IMAGE_PROCESSSING" with max concurrency = 2
    createPool('IMAGE_PROCESSING', 2);
    
    const poolStatus = getPoolStatus('IMAGE_PROCESSING');
    console.log(`🔵 Phase 1: Checking registered pool constraints...
      Pool name: IMAGE_PROCESSING
      Max Concurrency Limit: ${poolStatus.maxConcurrency}
      Current Active Task Count: ${poolStatus.activeCount}`);

    const initOk = poolStatus.maxConcurrency === 2 && poolStatus.activeCount === 0;
    if (initOk) {
        console.log('   ✅ PASS: Bulkhead pool instantiated with correct limits.');
    } else {
        console.error('   ❌ FAIL: Pool instantiation mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Simulating parallel operations to overflow pool...');

    let completedTasks = 0;
    const taskReject = () => 'BULKHEAD_REJECTED';

    const longTask = async (id, ms) => {
        console.log(`     [Pool:IMAGE_PROCESSING] Task ${id} entering execution track...`);
        await delay(ms);
        console.log(`     [Pool:IMAGE_PROCESSING] Task ${id} completed.`);
        completedTasks++;
        return 'SUCCESS';
    };

    // Trigger Task 1 & 2 concurrently (takes 300ms)
    const p1 = executeTask('IMAGE_PROCESSING', () => longTask(1, 300), taskReject);
    const p2 = executeTask('IMAGE_PROCESSING', () => longTask(2, 300), taskReject);

    // Give them a split millisecond to increment activeCount
    await delay(10);
    console.log(`   📍 Active Count during execute: ${getPoolStatus('IMAGE_PROCESSING').activeCount} (Expected: 2)`);

    // Trigger Task 3 (exceeds limit, should be rejected instantly)
    const p3 = executeTask('IMAGE_PROCESSING', () => longTask(3, 300), taskReject);
    
    const res3 = await p3;
    console.log(`   📍 Saturated Task 3 outcome: ${res3} (Expected: BULKHEAD_REJECTED)`);

    const res1 = await p1;
    const res2 = await p2;

    console.log(`   📍 Task 1 outcome: ${res1} | Task 2 outcome: ${res2}`);
    console.log(`   📍 Active Count after complete: ${getPoolStatus('IMAGE_PROCESSING').activeCount} (Expected: 0)`);
    console.log(`   📍 Total Completed Tasks: ${completedTasks} (Expected: 2)`);

    const runOk = res1 === 'SUCCESS' && res2 === 'SUCCESS' &&
                  res3 === 'BULKHEAD_REJECTED' &&
                  completedTasks === 2 &&
                  getPoolStatus('IMAGE_PROCESSING').activeCount === 0;

    if (runOk) {
        console.log('   ✅ PASS: Concurrency capped and overflow requests rejected safely.');
        console.log('\n🎉 SUCCESS: All Bulkhead Isolation concurrency assertions passed!');
    } else {
        console.error('   ❌ FAIL: Bulkhead failed to isolate resource pool.');
        process.exit(1);
    }
};

runVerification();
