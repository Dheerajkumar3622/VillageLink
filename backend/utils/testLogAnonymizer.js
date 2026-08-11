import { LogAnonymizer } from './logAnonymizer.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Log Anonymizer PII Scrubbing Verification        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const anonymizer = new LogAnonymizer();

    console.log('🔵 Test 1: Scrubbing email addresses from raw log text...');
    
    const textWithEmail = 'Connection established for user rajesh.kumar@gmail.com from device session.';
    const result1 = anonymizer.anonymizeString(textWithEmail);
    console.log(`   📍 Original: "${textWithEmail}"`);
    console.log(`   📍 Scrubbed: "${result1}"`);

    if (result1.includes('r******r@gmail.com') && !result1.includes('rajesh.kumar@gmail.com')) {
        console.log('   ✅ PASS: Email PII address scrubbed successfully.');
    } else {
        console.error('   ❌ FAIL: Email address was not anonymized correctly.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Scrubbing phone numbers from raw log text...');

    const textWithPhone = 'SMS notification routed to active mobile +91 9876543210 for booking confirmation.';
    const result2 = anonymizer.anonymizeString(textWithPhone);
    console.log(`   📍 Original: "${textWithPhone}"`);
    console.log(`   📍 Scrubbed: "${result2}"`);

    if (result2.includes('******3210') && !result2.includes('9876543210')) {
        console.log('   ✅ PASS: Phone PII numbers scrubbed successfully.');
    } else {
        console.error('   ❌ FAIL: Phone number was not anonymized correctly.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Traversing and sanitizing complex JSON database payload objects...');

    const rawPayload = {
        fullname: 'Dheeraj Kumar',
        email: 'dheeraj@villagelink.in',
        phone: '+91 8888877777',
        registration: {
            aadhar: '1234-5678-9012',
            ip: '103.88.99.41'
        },
        routeId: 2045
    };

    const scrubbedPayload = anonymizer.anonymizeObject(rawPayload);
    console.log('   📍 Scrubbed JSON Payload:', JSON.stringify(scrubbedPayload, null, 2));

    if (
        scrubbedPayload.fullname.includes('Dh******') &&
        scrubbedPayload.email === 'd******j@villagelink.in' &&
        scrubbedPayload.phone === '******7777' &&
        scrubbedPayload.registration.aadhar.includes('12******') &&
        scrubbedPayload.routeId === 2045
    ) {
        console.log('   ✅ PASS: Nested JSON parameter scrubbing verified successfully.');
        console.log('\n🎉 SUCCESS: All Log Anonymization checks passed!');
    } else {
        console.error('   ❌ FAIL: Object properties anonymization mismatch.');
        process.exit(1);
    }
};

runVerification();
