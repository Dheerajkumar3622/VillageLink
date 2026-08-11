import { AbacEngine } from './abacRules.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               ABAC Context Attribute Verification Checks       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const engine = new AbacEngine();

    console.log('🔵 Test 1: Evaluating bid modification authorization rules...');
    
    const ownerSubject = { id: 'farmer-101', role: 'farmer' };
    const strangerSubject = { id: 'farmer-202', role: 'farmer' };
    const adminSubject = { id: 'admin-001', role: 'admin' };
    const bidResource = { ownerId: 'farmer-101', status: 'OPEN' };
    const closedBidResource = { ownerId: 'farmer-101', status: 'CLOSED' };

    const check1 = engine.checkAccess(ownerSubject, bidResource, 'modify_bid');
    const check2 = engine.checkAccess(strangerSubject, bidResource, 'modify_bid');
    const check3 = engine.checkAccess(adminSubject, bidResource, 'modify_bid');
    const check4 = engine.checkAccess(ownerSubject, closedBidResource, 'modify_bid');

    console.log(`   📍 Owner access: ${check1.authorized} | Stranger access: ${check2.authorized} | Admin access: ${check3.authorized} | Closed status access: ${check4.authorized}`);

    if (check1.authorized && !check2.authorized && check3.authorized && !check4.authorized) {
        console.log('   ✅ PASS: Ownership and status boundary rules verified successfully.');
    } else {
        console.error('   ❌ FAIL: Bid modification access policies failure.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Evaluating driver dispatch proximity checks...');

    const activeDriver = { role: 'driver', isActive: true };
    const inactiveDriver = { role: 'driver', isActive: false };
    const cropOrder = { type: 'delivery' };

    const proximityCheck1 = engine.checkAccess(activeDriver, cropOrder, 'accept_order', { distanceKm: 4.5 });
    const proximityCheck2 = engine.checkAccess(activeDriver, cropOrder, 'accept_order', { distanceKm: 18.2 });
    const proximityCheck3 = engine.checkAccess(inactiveDriver, cropOrder, 'accept_order', { distanceKm: 2.0 });

    console.log(`   📍 Proximity 4.5km: ${proximityCheck1.authorized} | Proximity 18km: ${proximityCheck2.authorized} | Inactive driver: ${proximityCheck3.authorized}`);

    if (proximityCheck1.authorized && !proximityCheck2.authorized && !proximityCheck3.authorized) {
        console.log('   ✅ PASS: Driver status and distance limit checks verified successfully.');
    } else {
        console.error('   ❌ FAIL: Order dispatch proximity checks failure.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Evaluating wallet refund duration validation rules...');

    const cancelledOrder = { status: 'CANCELLED' };
    const completedOrder = { status: 'COMPLETED' };

    const refundCheck1 = engine.checkAccess({}, cancelledOrder, 'claim_refund', { hoursSincePurchase: 12 });
    const refundCheck2 = engine.checkAccess({}, cancelledOrder, 'claim_refund', { hoursSincePurchase: 72 });
    const refundCheck3 = engine.checkAccess({}, completedOrder, 'claim_refund', { hoursSincePurchase: 10 });

    console.log(`   📍 Within 48 hours: ${refundCheck1.authorized} | Exceeds 48 hours: ${refundCheck2.authorized} | Completed status check: ${refundCheck3.authorized}`);

    if (refundCheck1.authorized && !refundCheck2.authorized && !refundCheck3.authorized) {
        console.log('   ✅ PASS: Wallet cancellation refund timeframe policies verified successfully.');
        console.log('\n🎉 SUCCESS: All ABAC policies passed!');
    } else {
        console.error('   ❌ FAIL: Wallet refund duration validation failure.');
        process.exit(1);
    }
};

runVerification();
