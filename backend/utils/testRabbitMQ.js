import { RabbitMQ } from './rabbitmqQueue.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               RabbitMQ Task Queues ACK/NACK Validation         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const mq = new RabbitMQ();

    const workerLogs = {
        'Worker-Alpha': [],
        'Worker-Beta': []
    };

    console.log('🔵 Test 1: Registering competing workers...');
    
    // Register 2 competing workers
    mq.registerWorker('Worker-Alpha', (task, workerId) => {
        console.log(`     [${workerId}] Received: "${task.taskType}" (ID: ${task.taskId})`);
        workerLogs[workerId].push(task);
        
        // Simulating immediate successful ACK for non-failing tasks
        if (task.taskType !== 'FAILING_TASK') {
            console.log(`     [${workerId}] Processing completed. Sending ACK.`);
            mq.ack(task.taskId);
        } else {
            console.warn(`     [${workerId}] Processing failed! Sending NACK.`);
            mq.nack(task.taskId);
        }
    });

    mq.registerWorker('Worker-Beta', (task, workerId) => {
        console.log(`     [${workerId}] Received: "${task.taskType}" (ID: ${task.taskId})`);
        workerLogs[workerId].push(task);
        
        // Simulating immediate successful ACK for non-failing tasks
        if (task.taskType !== 'FAILING_TASK') {
            console.log(`     [${workerId}] Processing completed. Sending ACK.`);
            mq.ack(task.taskId);
        } else {
            console.warn(`     [${workerId}] Processing failed! Sending NACK.`);
            mq.nack(task.taskId);
        }
    });

    console.log('\n🔵 Test 2: Publishing tasks to verify round-robin distribution & ACK processing...');

    const t1 = mq.publishTask('GENERATE_PDF', { bookingId: 101 });
    const t2 = mq.publishTask('SEND_SMS', { phone: '9999' });
    const t3 = mq.publishTask('GENERATE_PDF', { bookingId: 102 });

    await delay(150);

    console.log(`   📍 Worker-Alpha Handled Count: ${workerLogs['Worker-Alpha'].length}`);
    console.log(`   📍 Worker-Beta Handled Count: ${workerLogs['Worker-Beta'].length}`);
    console.log(`   📍 Queue Pending Unacked Count: ${mq.getPendingCount()}`);

    // Verify round-robin mapping:
    // t1 -> Alpha, t2 -> Beta, t3 -> Alpha
    const roundRobinOk = workerLogs['Worker-Alpha'][0].taskId === t1 &&
                         workerLogs['Worker-Beta'][0].taskId === t2 &&
                         workerLogs['Worker-Alpha'][1].taskId === t3;

    const pendingOk = mq.getPendingCount() === 0;

    if (roundRobinOk && pendingOk) {
        console.log('   ✅ PASS: Tasks routed round-robin and cleared on ACK.');
    } else {
        console.error('   ❌ FAIL: Round-robin mapping or ACK check failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating worker task failure and NACK re-queue processing...');

    // Clear previous logs
    workerLogs['Worker-Alpha'] = [];
    workerLogs['Worker-Beta'] = [];

    // Publish a failing task
    const t4 = mq.publishTask('FAILING_TASK', { data: 'corrupted' });

    await delay(150);

    // Failing task is published. 
    // Dispatch 1: Beta receives it -> Fails -> NACK -> Re-queue
    // Dispatch 2: Alpha receives it (on retry) -> Fails -> NACK -> Re-queue ...
    // Since it constantly fails, we expect it to hit both workers multiple times.
    console.log(`   📍 Worker-Alpha Retry Ingests: ${workerLogs['Worker-Alpha'].length}`);
    console.log(`   📍 Worker-Beta Retry Ingests: ${workerLogs['Worker-Beta'].length}`);

    const retryOk = workerLogs['Worker-Alpha'].length > 0 && workerLogs['Worker-Beta'].length > 0;
    if (retryOk) {
        console.log('   ✅ PASS: Task re-queued to alternate workers on NACK signal.');
        console.log('\n🎉 SUCCESS: All RabbitMQ Task Queues assertions passed!');
    } else {
        console.error('   ❌ FAIL: Task retry routing failed.');
        process.exit(1);
    }
};

runVerification();
