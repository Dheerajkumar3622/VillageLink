import { processIdempotentRequest, getIdempotencyCacheSize, clearIdempotencyData } from './idempotency.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Idempotency Keys Request Deduplication Validation║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    clearIdempotencyData();

    let callCount = 0;
    const testAction = async (param) => {
        callCount++;
        return {
            status: 'PROCESSED',
            txnId: `TXN-${Math.floor(Math.random() * 100000)}`,
            inputParam: param
        };
    };

    console.log('🔵 Test 1: Executing initial transaction request...');
    
    const key = 'idemp-key-777';
    const res1 = await processIdempotentRequest(key, () => testAction('basmati-payout'));

    console.log(`   📍 Response 1 txnId: ${res1.txnId} | Call count: ${callCount}`);

    const test1Ok = callCount === 1 && res1.status === 'PROCESSED' && res1.inputParam === 'basmati-payout';
    if (test1Ok) {
        console.log('   ✅ PASS: Transaction processed and saved.');
    } else {
        console.error('   ❌ FAIL: Initial transaction execution failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating duplicate retried request with identical key...');

    const res2 = await processIdempotentRequest(key, () => testAction('basmati-payout'));
    console.log(`   📍 Response 2 txnId: ${res2.txnId} | Call count: ${callCount}`);

    const test2Ok = callCount === 1 && res2.txnId === res1.txnId;
    if (test2Ok) {
        console.log('   ✅ PASS: Duplicate request intercepted. Cached transaction returned directly.');
    } else {
        console.error('   ❌ FAIL: Duplicate transaction processed again, creating double side-effects!');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating distinct request with different key...');

    const alternateKey = 'idemp-key-888';
    const res3 = await processIdempotentRequest(alternateKey, () => testAction('transit-fare-payout'));
    
    console.log(`   📍 Response 3 txnId: ${res3.txnId} | Call count: ${callCount}`);

    const test3Ok = callCount === 2 && res3.txnId !== res1.txnId && res3.inputParam === 'transit-fare-payout';
    if (test3Ok) {
        console.log('   ✅ PASS: Distinct transaction processed independently.');
        console.log('\n🎉 SUCCESS: All Idempotency Keys assertions passed!');
    } else {
        console.error('   ❌ FAIL: Alternate key request routing mismatch.');
        process.exit(1);
    }
};

runVerification();
