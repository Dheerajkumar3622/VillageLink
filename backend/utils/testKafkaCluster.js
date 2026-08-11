import { KafkaCluster } from './kafkaCluster.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Event Broker Clustering Math & Balance Check     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const cluster = new KafkaCluster();
    const topicName = 'driver-locations';
    const groupName = 'location-ingest-group';

    // 1. Create topic with 3 partitions
    cluster.createTopic(topicName, 3);

    const receivedEvents = [];
    const consumerRecords = {
        'Consumer-1': [],
        'Consumer-2': []
    };

    // 2. Register 2 consumers in the group (balanced partitions)
    cluster.registerConsumer(topicName, groupName, 'Consumer-1', (event, consumerId) => {
        receivedEvents.push(event);
        consumerRecords[consumerId].push(event);
    });

    cluster.registerConsumer(topicName, groupName, 'Consumer-2', (event, consumerId) => {
        receivedEvents.push(event);
        consumerRecords[consumerId].push(event);
    });

    console.log('\n🔵 Phase 1: Publishing location update events for multiple drivers...');

    // Publish 6 events with diverse keys
    const drivers = ['driver-A', 'driver-B', 'driver-C', 'driver-D', 'driver-E', 'driver-F'];
    const publishOffsets = [];

    drivers.forEach((driverKey, i) => {
        const metadata = { lat: 25.5 + i * 0.01, lng: 84.1 + i * 0.01 };
        const result = cluster.publishEvent(topicName, driverKey, metadata);
        publishOffsets.push({ key: driverKey, ...result });
        console.log(`     [Publish] Key: "${driverKey}" -> Assigned Partition: ${result.partition} | Offset: ${result.offset}`);
    });

    // Wait for async task scheduler execution
    await delay(200);

    console.log('\n🔵 Phase 2: Evaluating balanced partition assignments...');
    
    console.log(`   📍 Total Published Events: ${drivers.length}`);
    console.log(`   📍 Total Consumer-1 Received: ${consumerRecords['Consumer-1'].length}`);
    console.log(`   📍 Total Consumer-2 Received: ${consumerRecords['Consumer-2'].length}`);

    // Verify consumer partition assignment balance.
    // Partition 0 maps to Consumer-1 (0 % 2 = 0)
    // Partition 1 maps to Consumer-2 (1 % 2 = 1)
    // Partition 2 maps to Consumer-1 (2 % 2 = 0)
    let partitionAssignmentOk = true;

    consumerRecords['Consumer-1'].forEach(event => {
        if (event.partition !== 0 && event.partition !== 2) {
            partitionAssignmentOk = false;
        }
    });

    consumerRecords['Consumer-2'].forEach(event => {
        if (event.partition !== 1) {
            partitionAssignmentOk = false;
        }
    });

    const receivedCountOk = receivedEvents.length === drivers.length;

    console.log(`   📍 Consumer Group Balance Verification: ${partitionAssignmentOk}`);
    console.log(`   📍 Received Event Count Match: ${receivedCountOk}`);

    if (partitionAssignmentOk && receivedCountOk) {
        console.log('   ✅ PASS: Partition keys hashed deterministically and balanced consumer groups.');
        console.log('\n🎉 SUCCESS: All Event Broker Clustering assertions passed!');
    } else {
        console.error('   ❌ FAIL: Event broker cluster partition balancing mismatch.');
        process.exit(1);
    }
};

runVerification();
