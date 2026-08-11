import { consumeToken, getBucketStatus, clearLimiterData } from './rateLimiter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Rate Limiter Token Bucket Math Validation          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    clearLimiterData();
    const clientId = 'client-user-91823';
    const capacity = 3;
    const refillRate = 1; // 1 token per second

    console.log(`🔵 Phase 1: Consuming burst tokens down to zero...
      Client ID: ${clientId}
      Max Burst Capacity: ${capacity}
      Refill Rate: ${refillRate} token/sec`);

    const call1 = consumeToken(clientId, capacity, refillRate);
    const call2 = consumeToken(clientId, capacity, refillRate);
    const call3 = consumeToken(clientId, capacity, refillRate);

    console.log(`   📍 Consume 1: ${call1} | Consume 2: ${call2} | Consume 3: ${call3}`);

    const initBurstOk = call1 && call2 && call3;
    if (initBurstOk) {
        console.log('   ✅ PASS: Burst capacity successfully consumed.');
    } else {
        console.error('   ❌ FAIL: Burst consumption failed.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Verifying rate limit exhaustion...');

    const callExhaust = consumeToken(clientId, capacity, refillRate);
    console.log(`   📍 Consume 4 (Exhausted): ${callExhaust} | Tokens Left: ${Math.round(getBucketStatus(clientId).tokens)}`);

    if (!callExhaust) {
        console.log('   ✅ PASS: Limiter correctly blocked request once tokens exhausted.');
    } else {
        console.error('   ❌ FAIL: Limiter allowed request on exhausted bucket.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 3: Waiting for dynamic timed refill...');
    console.log('   ⏳ Waiting 1200ms (refilling ~1.2 tokens)...');
    await delay(1200);

    const callAfterRefill = consumeToken(clientId, capacity, refillRate);
    console.log(`   📍 Consume 5 (Post-Refill): ${callAfterRefill} | Tokens Left: ${getBucketStatus(clientId).tokens.toFixed(3)}`);

    if (callAfterRefill) {
        console.log('   ✅ PASS: Dynamic token accumulation refilled bucket successfully.');
        console.log('\n🎉 SUCCESS: All Rate Limiter Token Bucket checks passed!');
    } else {
        console.error('   ❌ FAIL: Tokens failed to refill.');
        process.exit(1);
    }
};

runVerification();
