import { RedisPubSubAdapter } from './redisSocketAdapter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Redis Pub/Sub Socket Adapter Sync Check          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const adapter = new RedisPubSubAdapter();
    const channelName = 'yatra-driver-tracking';

    // Mock client messaging registers representing horizontal node targets
    const node1Messages = [];
    const node2Messages = [];

    console.log('🔵 Test 1: Simulating clustering setup (Node-1 & Node-2 subscribe to Redis channel)...');
    
    adapter.subscribeNode(channelName, 'Node-1', (event) => {
        node1Messages.push(event);
    });

    adapter.subscribeNode(channelName, 'Node-2', (event) => {
        node2Messages.push(event);
    });

    console.log('\n🔵 Test 2: Publishing driver tracking event from Node-1 to Redis backplane...');

    const payload = { driverId: 'DRV-789', lat: 25.54, lng: 84.05 };
    const receiptCount = adapter.publishMessage(channelName, payload, 'Node-1');

    console.log(`   📍 Message published. Active cluster node subscriptions hit: ${receiptCount}`);

    await delay(100);

    console.log(`   📍 Node-1 Received Queue size: ${node1Messages.length}`);
    console.log(`   📍 Node-2 Received Queue size: ${node2Messages.length}`);

    // Verify inter-instance routing success
    const node1Ok = node1Messages.length === 1 &&
                    node1Messages[0].senderNodeId === 'Node-1' &&
                    node1Messages[0].payload.driverId === 'DRV-789';

    const node2Ok = node2Messages.length === 1 &&
                    node2Messages[0].senderNodeId === 'Node-1' &&
                    node2Messages[0].payload.driverId === 'DRV-789';

    if (node1Ok && node2Ok) {
        console.log('   ✅ PASS: Cross-instance broadcast synchronized correctly across servers.');
        console.log('\n🎉 SUCCESS: All Redis Pub/Sub Socket Adapter assertions passed!');
    } else {
        console.error('   ❌ FAIL: Cross-instance broadcast synchronization failed.');
        process.exit(1);
    }
};

runVerification();
