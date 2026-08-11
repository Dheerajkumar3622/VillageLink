import { SchemaChecker } from './schemaChecker.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               API Payload Schema Validation Verification       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const checker = new SchemaChecker();

    console.log('🔵 Test 1: Validating fully compliant booking payload...');
    const res1 = checker.validate('booking', {
        riderId: 'u-10992',
        pickup: 'Patna Junction',
        destination: 'Mandi Hub A',
        seats: 3
    });
    console.log('   📍 Valid Payload Status:', res1.valid);

    if (res1.valid && res1.errors.length === 0) {
        console.log('   ✅ PASS: Valid payload accepted without issues.');
    } else {
        console.error('   ❌ FAIL: Valid payload rejected.', res1.errors);
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Submitting payload with missing attributes (destination/seats)...');
    const res2 = checker.validate('booking', {
        riderId: 'u-10992',
        pickup: 'Patna Junction'
    });
    console.log('   📍 Missing Fields Errors:', JSON.stringify(res2.errors));

    if (!res2.valid && res2.errors.includes('Missing mandatory field: "destination"') && res2.errors.includes('Missing mandatory field: "seats"')) {
        console.log('   ✅ PASS: Missing parameters caught and rejected early.');
    } else {
        console.error('   ❌ FAIL: Missing fields check did not block payload.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Submitting payload with regex violation (riderId format)...');
    const res3 = checker.validate('booking', {
        riderId: 'user-xyz', // Invalid format (should be u-[digits])
        pickup: 'Patna Junction',
        destination: 'Mandi Hub A',
        seats: 3
    });
    console.log('   📍 Regex Format Errors:', JSON.stringify(res3.errors));

    if (!res3.valid && res3.errors.some(e => e.includes('riderId') && e.toLowerCase().includes('pattern'))) {
        console.log('   ✅ PASS: Format regex mismatch rejected.');
    } else {
        console.error('   ❌ FAIL: Invalid format bypassed validator.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Submitting payload with numeric boundary violations...');
    const res4 = checker.validate('booking', {
        riderId: 'u-10992',
        pickup: 'Patna Junction',
        destination: 'Mandi Hub A',
        seats: 12 // Boundary breach (max 8)
    });
    console.log('   📍 Boundary Violations Errors:', JSON.stringify(res4.errors));

    if (!res4.valid && res4.errors.some(e => e.includes('seats') && e.toLowerCase().includes('bounds'))) {
        console.log('   ✅ PASS: Out-of-bounds numeric parameters successfully blocked.');
    } else {
        console.error('   ❌ FAIL: Seat boundary breach was not caught.');
        process.exit(1);
    }

    console.log('\n🔵 Test 5: Validating crop bidding schema requirements...');
    const res5 = checker.validate('bid', {
        cropId: 'crop-4001',
        bidAmount: 250.75
    });
    console.log('   📍 Bid Validation Status:', res5.valid);

    if (res5.valid) {
        console.log('   ✅ PASS: Valid crop bidding payload approved.');
        console.log('\n🎉 SUCCESS: All API payload schema checking validation checks passed!');
    } else {
        console.error('   ❌ FAIL: Crop bid payload validation failed.');
        process.exit(1);
    }
};

runVerification();
