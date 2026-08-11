import { LokiLogger } from './lokiLogger.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Grafana Loki Log Aggregation Verification Checks ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const logger = new LokiLogger();

    console.log('🔵 Test 1: Simulating log push with Loki index labels...');
    
    const res1 = logger.pushLog('info', 'Driver booking active session heartbeat', 'logistics-hub');
    console.log(`   📍 Pushed Status: ${res1.pushed}`);
    
    const streamInfo = res1.payload.streams[0].stream;
    console.log(`   📍 Parsed Metadata Labels: { app: "${streamInfo.app}", env: "${streamInfo.env}", level: "${streamInfo.level}", job: "${streamInfo.job}" }`);

    if (res1.pushed && streamInfo.app === 'villagelink' && streamInfo.level === 'info' && streamInfo.job === 'logistics-hub') {
        console.log('   ✅ PASS: Log metadata labels index correctly assembled.');
    } else {
        console.error('   ❌ FAIL: Loki stream label index mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Checking nanosecond precision timestamp format compliance...');

    const timestampStr = res1.timestampNano;
    console.log(`   📍 Generated Nanoseconds String: "${timestampStr}"`);

    if (/^\d{13}000000$/.test(timestampStr)) {
        console.log('   ✅ PASS: Nanosecond string precision verified successfully.');
    } else {
        console.error('   ❌ FAIL: Timestamp format does not match Loki nanosecond stream expectation.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Validating log value stream payload tuples...');

    const valuesTuple = res1.payload.streams[0].values[0];
    console.log(`   📍 Stream Tuple Size: ${valuesTuple.length} | Payload Line: "${valuesTuple[1]}"`);

    if (valuesTuple.length === 2 && valuesTuple[1] === 'Driver booking active session heartbeat') {
        console.log('   ✅ PASS: Loki log tuple array payload formatted correctly.');
        console.log('\n🎉 SUCCESS: All Grafana Loki Log Aggregation checks passed!');
    } else {
        console.error('   ❌ FAIL: Stream values format invalid.');
        process.exit(1);
    }
};

runVerification();
