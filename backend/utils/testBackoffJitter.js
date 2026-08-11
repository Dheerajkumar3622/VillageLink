import { calculateBackoffDelay } from './backoffJitter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Exponential Backoff with Jitter Validation       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking backoff ranges per retry attempt...');

    const base = 1000;
    const max = 10000;

    const delay0 = calculateBackoffDelay(0, base, max);
    const delay1 = calculateBackoffDelay(1, base, max);
    const delay2 = calculateBackoffDelay(2, base, max);
    const delay3 = calculateBackoffDelay(3, base, max);

    console.log(`   📍 Attempt 1 (Cap=1s): Calculated delay = ${delay0}ms (Expected range: 0-1000)`);
    console.log(`   📍 Attempt 2 (Cap=2s): Calculated delay = ${delay1}ms (Expected range: 0-2000)`);
    console.log(`   📍 Attempt 3 (Cap=4s): Calculated delay = ${delay2}ms (Expected range: 0-4000)`);
    console.log(`   📍 Attempt 4 (Cap=8s): Calculated delay = ${delay3}ms (Expected range: 0-8000)`);

    const checks1Ok = delay0 >= 0 && delay0 <= 1000 &&
                     delay1 >= 0 && delay1 <= 2000 &&
                     delay2 >= 0 && delay2 <= 4000 &&
                     delay3 >= 0 && delay3 <= 8000;

    if (checks1Ok) {
        console.log('   ✅ PASS: Backoff values are correctly bounded.');
    } else {
        console.error('   ❌ FAIL: Backoff delay outside expected boundaries.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Verifying maximum ceiling limits capping...');
    
    // Attempt 15 would be 1000 * 2^15 = 32,768,000ms. Capped at 10,000ms.
    const sampleCappedDelays = Array.from({ length: 50 }, () => calculateBackoffDelay(15, base, max));
    const allCapped = sampleCappedDelays.every(d => d >= 0 && d <= max);
    const averageCapped = sampleCappedDelays.reduce((a, b) => a + b, 0) / sampleCappedDelays.length;

    console.log(`   📍 Max Cap check: All 50 checks bounded <= ${max}ms: ${allCapped}`);
    console.log(`   📍 Average capped delay: ${Math.round(averageCapped)}ms (Expected ~5000ms)`);

    if (allCapped && averageCapped > 2000 && averageCapped < 8000) {
        console.log('   ✅ PASS: Ceiling caps and full jitter variations validated.');
        console.log('\n🎉 SUCCESS: All Exponential Backoff with Jitter checks passed!');
    } else {
        console.error('   ❌ FAIL: Ceiling caps or jitter distribution verification failed.');
        process.exit(1);
    }
};

runVerification();
