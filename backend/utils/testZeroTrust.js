import { verifyServiceRequest } from './zeroTrust.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Zero-Trust Security Gateway validation           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    console.log('🔵 Test 1: Simulating authenticated request within authorized scope...');

    const res1 = verifyServiceRequest('tok-yatra-332', 'calculate_surge');
    console.log('   📍 Response:', JSON.stringify(res1, null, 2));

    const test1Ok = res1.authorized === true && res1.serviceName === 'yatra-transit-service';
    if (test1Ok) {
        console.log('   ✅ PASS: Valid action authorized correctly.');
    } else {
        console.error('   ❌ FAIL: Valid request was blocked.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating authenticated request outside boundary scope...');

    const res2 = verifyServiceRequest('tok-mandi-893', 'mutate_wallet');
    console.log('   📍 Response:', JSON.stringify(res2, null, 2));

    const test2Ok = res2.authorized === false && res2.reason === 'UNAUTHORIZED_ACTION';
    if (test2Ok) {
        console.log('   ✅ PASS: Request outside boundaries blocked successfully.');
    } else {
        console.error('   ❌ FAIL: Unauthorized action was allowed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating unauthenticated request injection...');

    const res3 = verifyServiceRequest('tok-anonymous-hack', 'refund_claim');
    console.log('   📍 Response:', JSON.stringify(res3, null, 2));

    const test3Ok = res3.authorized === false && res3.reason === 'INVALID_AUTHENTICATION_TOKEN';
    if (test3Ok) {
        console.log('   ✅ PASS: Request with invalid key rejected immediately.');
        console.log('\n🎉 SUCCESS: All Zero-Trust Security Gateway checks passed!');
    } else {
        console.error('   ❌ FAIL: Invalid key bypass detected.');
        process.exit(1);
    }
};

runVerification();
