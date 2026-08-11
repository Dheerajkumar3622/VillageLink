import { MqttBroker } from './mqttClient.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               MQTT IoT Protocol Wildcard Routing Check         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const broker = new MqttBroker();

    console.log('🔵 Test 1: Registering exact topic listener...');
    
    let exactMsgReceived = null;
    broker.subscribe('vehicles/driver-101/telemetry', (topic, payload) => {
        exactMsgReceived = { topic, payload };
    });

    const pubResult1 = broker.publish('vehicles/driver-101/telemetry', { speed: 45, lat: 25.56 });
    console.log(`   📍 Published telemetry, Subscriber matches found: ${pubResult1.matches}`);

    await delay(100);

    const test1Ok = exactMsgReceived !== null &&
                    exactMsgReceived.topic === 'vehicles/driver-101/telemetry' &&
                    exactMsgReceived.payload.speed === 45;

    if (test1Ok) {
        console.log('   ✅ PASS: Exact topic event delivered.');
    } else {
        console.error('   ❌ FAIL: Exact topic delivery failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Registering single-level wildcard "+" topic listener...');

    const wildcardEvents = [];
    broker.subscribe('mandi/+/prices', (topic, payload) => {
        wildcardEvents.push({ topic, payload });
    });

    // Publish to paths matching wildcard
    broker.publish('mandi/buxar/prices', { Basmati: 3200 });
    broker.publish('mandi/arrah/prices', { basmati: 3100 });

    // Publish to path that should NOT match wildcard
    broker.publish('mandi/buxar/listings/temp', { count: 3 });

    await delay(100);

    console.log(`   📍 Wildcard Matches Received Count: ${wildcardEvents.length} (Expected: 2)`);
    wildcardEvents.forEach((ev, i) => {
        console.log(`     [Match ${i + 1}] Topic: "${ev.topic}" | Payload:`, JSON.stringify(ev.payload));
    });

    const test2Ok = wildcardEvents.length === 2 &&
                    wildcardEvents[0].topic === 'mandi/buxar/prices' &&
                    wildcardEvents[1].topic === 'mandi/arrah/prices';

    if (test2Ok) {
        console.log('   ✅ PASS: Wildcard pattern successfully routed matching topic segments.');
        console.log('\n🎉 SUCCESS: All MQTT IoT Protocol assertions passed!');
    } else {
        console.error('   ❌ FAIL: Wildcard routing failed.');
        process.exit(1);
    }
};

runVerification();
