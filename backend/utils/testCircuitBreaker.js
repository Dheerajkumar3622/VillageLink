import { CircuitBreaker } from './circuitBreaker.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Circuit Breaker Pattern Validation               ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    // 1. Initialize Circuit Breaker with failure threshold 3 and cooldown 1000ms
    const breaker = new CircuitBreaker('MockRazorpay', 3, 1000);
    const fallback = () => 'FALLBACK_DATA';

    console.log('🔵 Phase 1: Normal operational state (CLOSED)...');
    
    let callCount = 0;
    const actionSuccess = async () => {
        callCount++;
        return 'PAYMENT_PROCESSED';
    };

    const res1 = await breaker.execute(actionSuccess, fallback);
    console.log(`   📍 Call response: ${res1} | State: ${breaker.state} | Failures: ${breaker.failuresCount}`);

    const phase1Ok = res1 === 'PAYMENT_PROCESSED' && breaker.state === 'CLOSED';
    if (phase1Ok) {
        console.log('   ✅ PASS: Normal traffic flows when circuit is CLOSED.');
    } else {
        console.error('   ❌ FAIL: Closed state execution failed.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Simulating downstream dependency failures & tripping...');

    const actionFail = async () => {
        throw new Error('Razorpay Gateway Outage');
    };

    // Trigger failure 1
    const resFail1 = await breaker.execute(actionFail, fallback);
    console.log(`   📍 Fail 1 response: ${resFail1} | State: ${breaker.state} | Failures: ${breaker.failuresCount}`);

    // Trigger failure 2
    const resFail2 = await breaker.execute(actionFail, fallback);
    console.log(`   📍 Fail 2 response: ${resFail2} | State: ${breaker.state} | Failures: ${breaker.failuresCount}`);

    // Trigger failure 3 (Trips circuit)
    const resFail3 = await breaker.execute(actionFail, fallback);
    console.log(`   📍 Fail 3 response: ${resFail3} | State: ${breaker.state} | Failures: ${breaker.failuresCount}`);

    const phase2Ok = breaker.state === 'OPEN' && resFail3 === 'FALLBACK_DATA';
    if (phase2Ok) {
        console.log('   ✅ PASS: Circuit correctly tripped to OPEN on repeated failures.');
    } else {
        console.error('   ❌ FAIL: Circuit did not trip to OPEN.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 3: Bypassing execution & returning fallback immediately...');

    let executed = false;
    const actionMock = async () => {
        executed = true;
        return 'SHOULD_NOT_EXECUTE';
    };

    const resBypass = await breaker.execute(actionMock, fallback);
    console.log(`   📍 Response while OPEN: ${resBypass} | Executed action: ${executed}`);

    const phase3Ok = resBypass === 'FALLBACK_DATA' && !executed;
    if (phase3Ok) {
        console.log('   ✅ PASS: Incoming requests bypassed and fallback returned.');
    } else {
        console.error('   ❌ FAIL: Action executed despite OPEN circuit.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 4: Cooldown expiration and trial recovery (HALF-OPEN -> CLOSED)...');

    console.log('   ⏳ Waiting 1200ms for cooldown expiration...');
    await delay(1200);

    const actionRecover = async () => {
        return 'SUCCESSFUL_RECOVERY_CALL';
    };

    const resRecover = await breaker.execute(actionRecover, fallback);
    console.log(`   📍 Response during recovery: ${resRecover} | State: ${breaker.state}`);

    const phase4Ok = resRecover === 'SUCCESSFUL_RECOVERY_CALL' && breaker.state === 'CLOSED';
    if (phase4Ok) {
        console.log('   ✅ PASS: Trial call succeeded. Circuit reset to CLOSED.');
        console.log('\n🎉 SUCCESS: All Circuit Breaker Pattern assertions passed!');
    } else {
        console.error('   ❌ FAIL: Circuit failed to recover.');
        process.exit(1);
    }
};

runVerification();
