import { DeliveryManager } from './atLeastOnceDelivery.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               At-Least-Once Delivery Guarantees Check          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    // Retry interval of 100ms
    const manager = new DeliveryManager(100);

    // Mock target receiver node
    const receivedDeliveries = [];
    const mockReceiverNode = {
        receive: (msgId, payload) => {
            receivedDeliveries.push({ msgId, payload, time: Date.now() });
        }
    };

    console.log('🔵 Test 1: Sending message with immediate acknowledgment...');

    const msgId1 = 'MSG-999';
    manager.sendMessage(msgId1, { content: 'Basmati Deal Accepted' }, mockReceiverNode);
    
    // Ack immediately
    manager.acknowledgeReceipt(msgId1);

    await delay(300);

    const test1Ok = receivedDeliveries.length === 1 && receivedDeliveries[0].msgId === msgId1;
    console.log(`   📍 Total received deliveries: ${receivedDeliveries.length}`);

    if (test1Ok) {
        console.log('   ✅ PASS: Message acknowledged immediately, zero retries sent.');
    } else {
        console.error('   ❌ FAIL: Immediate ack retry lifecycle mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating network lag/drop (delayed acknowledgment)...');

    // Reset deliveries
    receivedDeliveries.length = 0;

    const msgId2 = 'MSG-888';
    manager.sendMessage(msgId2, { content: 'Transit Dispatch Log' }, mockReceiverNode);

    // Wait 250ms (allows ~2 retries, total attempts = 3)
    await delay(250);

    console.log(`   📍 Received deliveries count before ACK: ${receivedDeliveries.length}`);
    const beforeAckCount = receivedDeliveries.length;

    // Acknowledge receipt now
    manager.acknowledgeReceipt(msgId2);

    // Wait another 200ms to ensure retries stop
    await delay(200);

    console.log(`   📍 Received deliveries count after ACK: ${receivedDeliveries.length}`);

    const test2Ok = beforeAckCount > 1 && receivedDeliveries.length === beforeAckCount;
    if (test2Ok) {
        console.log('   ✅ PASS: Delivery retried until ACK, then successfully stopped.');
        console.log('\n🎉 SUCCESS: All At-Least-Once Delivery Guarantees checks passed!');
    } else {
        console.error('   ❌ FAIL: Retries did not stop after acknowledgment.');
        process.exit(1);
    }

    manager.stopAll();
};

runVerification();
