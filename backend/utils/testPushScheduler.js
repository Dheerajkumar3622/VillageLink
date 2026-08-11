import { 
    scheduleLocalNotification, 
    cancelLocalNotification, 
    checkAndTriggerAlarms, 
    getActiveAlarms,
    clearAllAlarms
} from './localPushScheduler.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Local Push Notification Scheduler Validation       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    clearAllAlarms();
    const baseTime = 1000000; // Simulated absolute starting epoch time

    console.log('🔵 Phase 1: Scheduling multiple local notifications...');
    
    scheduleLocalNotification(
        'alarm-bid-close',
        'Mandi Bid Closing Soon',
        'Your wheat quality grade price bid window is closing in 10 minutes.',
        baseTime + 1000 // due at 1001000
    );

    scheduleLocalNotification(
        'alarm-ride-departs',
        'Yatra Ride Imminent',
        'Your shared passenger EV bus is arriving in 5 minutes.',
        baseTime + 3000 // due at 1003000
    );

    scheduleLocalNotification(
        'alarm-refund-settled',
        'Wallet Refund Claim Set',
        'Your self-healing transaction wallet refund has been credited.',
        baseTime + 5000 // due at 1005000
    );

    console.log(`   📍 Active queue size: ${getActiveAlarms().length} (Expected: 3)`);

    const hasThreeAlarms = getActiveAlarms().length === 3;
    if (hasThreeAlarms) {
        console.log('   ✅ PASS: Push reminder items schedule successfully.');
    } else {
        console.error('   ❌ FAIL: Alarm queue size mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Cancelling active alerts...');
    const cancelStatus = cancelLocalNotification('alarm-ride-departs');
    console.log(`   📍 Cancel status for ride-departs: ${cancelStatus}`);
    console.log(`   📍 Active queue size after cancel: ${getActiveAlarms().length} (Expected: 2)`);

    const cancelOk = cancelStatus === true && getActiveAlarms().length === 2;
    if (cancelOk) {
        console.log('   ✅ PASS: Alarm cancellation completed successfully.');
    } else {
        console.error('   ❌ FAIL: Alarm cancellation did not update list.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 3: Triggering due notifications at simulated epoch slots...');

    // Tick 1: at time baseTime + 2000
    console.log(`   ⏰ Ticking alarm clock to: ${baseTime + 2000}`);
    const tick1 = checkAndTriggerAlarms(baseTime + 2000);
    console.log(`   📍 Fired count: ${tick1.length} (Expected: 1 - alarm-bid-close)`);

    const bidCloseFired = tick1.length === 1 && tick1[0].id === 'alarm-bid-close';

    // Tick 2: at time baseTime + 6000
    console.log(`   ⏰ Ticking alarm clock to: ${baseTime + 6000}`);
    const tick2 = checkAndTriggerAlarms(baseTime + 6000);
    console.log(`   📍 Fired count: ${tick2.length} (Expected: 1 - alarm-refund-settled)`);

    const refundFired = tick2.length === 1 && tick2[0].id === 'alarm-refund-settled';
    console.log(`   📍 Final queue size: ${getActiveAlarms().length} (Expected: 0)`);

    const triggerOk = bidCloseFired && refundFired && getActiveAlarms().length === 0;

    if (triggerOk) {
        console.log('   ✅ PASS: Alarm triggers fired matching correct epoch schedules.');
        console.log('\n🎉 SUCCESS: All Local Push Notification Scheduler checks passed!');
    } else {
        console.error('   ❌ FAIL: Alarm trigger checks failed.');
        process.exit(1);
    }
};

runVerification();
