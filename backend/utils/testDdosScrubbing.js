import { ScrubbingCenter } from './ddosScrubbing.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               DDoS Scrubbing Center Traffic Screening Check    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const scrubber = new ScrubbingCenter();
    const cleanIp = '103.88.54.21';
    const floodIp = '185.220.101.5';

    console.log('🔵 Test 1: Simulating legitimate user requests pacing...');
    
    let cleanPassed = true;
    for (let i = 0; i < 5; i++) {
        const check = scrubber.scrubTraffic(cleanIp);
        if (check.status !== 'CLEAN') cleanPassed = false;
    }

    if (cleanPassed) {
        console.log('   ✅ PASS: Legitimate user requests flagged as CLEAN.');
    } else {
        console.error('   ❌ FAIL: Clean traffic blocked by scrubbing filter.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating volumetric flood attack from single IP...');

    let mitigatedCount = 0;
    let allowedCount = 0;

    for (let i = 0; i < 12; i++) {
        const check = scrubber.scrubTraffic(floodIp);
        if (check.status === 'CLEAN') {
            allowedCount++;
        } else if (check.status === 'MITIGATED_AND_BLOCKED') {
            mitigatedCount++;
        }
    }

    console.log(`   📍 Allowed packets before threshold: ${allowedCount}`);
    console.log(`   📍 Mitigation triggers logged: ${mitigatedCount}`);

    const test2Ok = allowedCount === 10 && mitigatedCount === 1;

    if (test2Ok) {
        console.log('   ✅ PASS: Volumetric flood successfully mitigated at 10-packet limit.');
    } else {
        console.error('   ❌ FAIL: Mitigator did not trigger correctly on volumetric limit.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Checking persistent IP quarantine blockage...');

    const quarantineCheck = scrubber.scrubTraffic(floodIp);
    console.log(`   📍 Quarantined Packet Status: ${quarantineCheck.status}`);

    if (!quarantineCheck.pass && quarantineCheck.status === 'BLOCKED') {
        console.log('   ✅ PASS: Subsequent packets from quarantined IP dropped automatically.');
    } else {
        console.error('   ❌ FAIL: Quarantined IP bypassed blockage.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Validating quarantine expiration and IP re-entry...');

    // Wait 1.1s for blocklist entry expiry
    await delay(1100);

    const postExpiryCheck = scrubber.scrubTraffic(floodIp);
    console.log(`   📍 Post-Expiry Packet Status: ${postExpiryCheck.status}`);

    if (postExpiryCheck.pass && postExpiryCheck.status === 'CLEAN') {
        console.log('   ✅ PASS: IP successfully re-admitted after quarantine expiration.');
        console.log('\n🎉 SUCCESS: All DDoS Scrubbing Center checks passed!');
    } else {
        console.error('   ❌ FAIL: IP not cleaned from blocklist after TTL expiration.');
        process.exit(1);
    }
};

runVerification();
