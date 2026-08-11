import { appendEvent, reconstructState } from './eventStore.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                Event Sourcing & Time-Travel Validation         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const ORDER_ID = 'order_sasaram_9381';

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runEventSourcingTests = async () => {
    console.log('🔵 Phase 1: Appending lifecycle events chronologically...');

    const t0 = Date.now();
    appendEvent(ORDER_ID, 'ORDER_CREATED', { farmerId: 'FARMER-303', crop: 'Rice', quantity: 50, price: 3000 });
    
    await delay(100);
    const t1 = Date.now();
    appendEvent(ORDER_ID, 'PRICE_SURGED', { newPrice: 4500, reason: 'High demand near Sasaram Mandi' });
    
    await delay(100);
    const t2 = Date.now();
    appendEvent(ORDER_ID, 'DRIVER_ASSIGNED', { driverId: 'DRV-9022', vehicleNumber: 'BR-24-A-1082' });
    
    await delay(100);
    const t3 = Date.now();
    appendEvent(ORDER_ID, 'CROP_PICKED_UP');
    
    await delay(100);
    const t4 = Date.now();
    appendEvent(ORDER_ID, 'ORDER_DELIVERED');

    // --- TEST 1: RECONSTRUCT CURRENT STATE ---
    console.log('\n🔵 Test 1: Reconstructing CURRENT state (Replaying all events)...');
    const currentState = reconstructState(ORDER_ID);
    console.log('   📍 Current Status:  ', currentState.status);
    console.log('   📍 Current Price:   ', currentState.price);
    console.log('   📍 Assigned Driver: ', currentState.driverId);
    console.log('   📍 Total Version:   ', currentState.version);

    const test1Ok = currentState.status === 'DELIVERED' && currentState.price === 4500 && currentState.driverId === 'DRV-9022';
    if (test1Ok) {
        console.log('   ✅ PASS: Current state reconstructed accurately.');
    } else {
        console.error('   ❌ FAIL: Reconstructed state mismatch.');
    }

    // --- TEST 2: TIME-TRAVEL TO T=0.5 (BEFORE PRICE SURGE) ---
    console.log(`\n🔵 Test 2: Time-travel querying state BEFORE price surge (Time: ${t1 - 50})...`);
    const stateBeforeSurge = reconstructState(ORDER_ID, t1 - 50);
    console.log('   📍 Status:          ', stateBeforeSurge.status);
    console.log('   📍 Price:           ', stateBeforeSurge.price); // should be 3000
    console.log('   📍 Assigned Driver: ', stateBeforeSurge.driverId || 'None'); // should be undefined/None
    console.log('   📍 Version:         ', stateBeforeSurge.version);

    const test2Ok = stateBeforeSurge.status === 'PENDING' && stateBeforeSurge.price === 3000 && !stateBeforeSurge.driverId;
    if (test2Ok) {
        console.log('   ✅ PASS: Time-travel query verified initial order state correctly.');
    } else {
        console.error('   ❌ FAIL: Inconsistent time-travel state.');
    }

    // --- TEST 3: TIME-TRAVEL TO T=2.5 (AFTER DRIVER ASSIGNED, BEFORE PICKUP) ---
    console.log(`\n🔵 Test 3: Time-travel querying state AFTER driver assignment (Time: ${t3 - 50})...`);
    const stateAfterDriver = reconstructState(ORDER_ID, t3 - 50);
    console.log('   📍 Status:          ', stateAfterDriver.status); // should be ASSIGNED
    console.log('   📍 Price:           ', stateAfterDriver.price); // should be 4500
    console.log('   📍 Assigned Driver: ', stateAfterDriver.driverId); // should be DRV-9022
    console.log('   📍 Version:         ', stateAfterDriver.version);

    const test3Ok = stateAfterDriver.status === 'ASSIGNED' && stateAfterDriver.price === 4500 && stateAfterDriver.driverId === 'DRV-9022';
    if (test3Ok) {
        console.log('   ✅ PASS: Time-travel query verified assignment state correctly.');
    } else {
        console.error('   ❌ FAIL: Inconsistent time-travel state.');
    }

    if (test1Ok && test2Ok && test3Ok) {
        console.log('\n🎉 SUCCESS: All Event Sourcing and Time-Travel state audits passed!');
    } else {
        console.error('\n❌ FAILURE: Event Sourcing verification failed.');
        process.exit(1);
    }
};

runEventSourcingTests().catch(err => console.error(err));
