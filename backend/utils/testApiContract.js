import { ApiContractVerifier } from './apiContract.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               API Contract Schema Validation Verification      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const verifier = new ApiContractVerifier();

    console.log('🔵 Test 1: Validating a structurally correct booking payload...');
    
    const validBooking = {
        origin: 'Nuaon Farm Hub',
        destination: 'Buxar Grain Terminal',
        passengersCount: 2
    };

    const res1 = verifier.validate('createBooking', validBooking);
    console.log(`   📍 Valid: ${res1.valid} | Errors: [${res1.errors.join(', ')}]`);

    if (res1.valid) {
        console.log('   ✅ PASS: Valid booking contract passed checks successfully.');
    } else {
        console.error('   ❌ FAIL: Valid booking payload blocked by validator.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Validating a malformed booking payload (missing property + type error)...');

    const invalidBooking = {
        origin: 'Nuaon Farm Hub',
        passengersCount: 'Two' // Must be number type
        // Missing destination
    };

    const res2 = verifier.validate('createBooking', invalidBooking);
    console.log(`   📍 Valid: ${res2.valid} | Errors: [${res2.errors.join(', ')}]`);

    if (!res2.valid && res2.errors.length === 2) {
        console.log('   ✅ PASS: Missing and malformed booking fields flagged correctly.');
    } else {
        console.error('   ❌ FAIL: Malformed booking payload bypassed schema contract checks.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Validating a correct driver bid contract...');

    const validBid = {
        bidId: 'bid-uuid-004',
        amount: 320.00,
        driverId: 'driver-999'
    };

    const res3 = verifier.validate('submitBid', validBid);
    console.log(`   📍 Valid: ${res3.valid} | Errors: [${res3.errors.join(', ')}]`);

    if (res3.valid) {
        console.log('   ✅ PASS: Valid driver bidding contract passed checks successfully.');
    } else {
        console.error('   ❌ FAIL: Valid bidding payload blocked by validator.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Validating an out-of-range driver bid contract...');

    const invalidBid = {
        bidId: 'bid-uuid-004',
        amount: 0.00, // Below min limit (0.01)
        driverId: 'driver-999'
    };

    const res4 = verifier.validate('submitBid', invalidBid);
    console.log(`   📍 Valid: ${res4.valid} | Errors: [${res4.errors.join(', ')}]`);

    if (!res4.valid && res4.errors.length === 1) {
        console.log('   ✅ PASS: Bid range violation flagged correctly.');
        console.log('\n🎉 SUCCESS: All API Contract Verification checks passed!');
    } else {
        console.error('   ❌ FAIL: Out-of-range bidding payload bypassed schema contract checks.');
        process.exit(1);
    }
};

runVerification();
