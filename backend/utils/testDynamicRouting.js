import { DynamicRouter } from './dynamicRouter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Dynamic Routing Middleware Rewrite Verification   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const router = new DynamicRouter();

    console.log('🔵 Test 1: Forwarding standard request route without modifications...');
    
    const req1 = {
        path: '/api/v1/crops',
        headers: { 'x-user-role': 'guest' },
        query: {}
    };

    const res1 = router.resolveRoute(req1);
    console.log(`   📍 Rule Applied: ${res1.rule} | Result Route: "${res1.path}"`);

    if (res1.rule === 'NONE' && res1.path === '/api/v1/crops') {
        console.log('   ✅ PASS: Normal request passed through correctly.');
    } else {
        console.error('   ❌ FAIL: Incorrect routing rewrite applied to guest request.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Rewriting route dynamically based on client Kisan role headers...');

    const req2 = {
        path: '/api/v1/orders',
        headers: { 'x-user-role': 'kisan' },
        query: {}
    };

    const res2 = router.resolveRoute(req2);
    console.log(`   📍 Rule Applied: ${res2.rule} | Result Route: "${res2.path}"`);

    if (res2.rule === 'HEADER_USER_ROLE' && res2.path === '/api/v1/kisan-hub/api/v1/orders') {
        console.log('   ✅ PASS: Header parameter matched and path dynamically prepended.');
    } else {
        console.error('   ❌ FAIL: Failed to rewrite path for Kisan role.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Redirecting request dynamically based on beta query parameters...');

    const req3 = {
        path: '/api/v1/bookings',
        headers: { 'x-user-role': 'guest' },
        query: { beta: 'true' }
    };

    const res3 = router.resolveRoute(req3);
    console.log(`   📍 Rule Applied: ${res3.rule} | Result Route: "${res3.path}"`);

    if (res3.rule === 'QUERY_BETA_FLAG' && res3.path === '/api/v2/bookings') {
        console.log('   ✅ PASS: Query check matched and version redirect resolved successfully.');
    } else {
        console.error('   ❌ FAIL: Beta query parameter redirect failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Dynamic failover routing on service state change (Offline Mode)...');

    // Simulate backend server disconnect
    router.setServiceStatus('mandi-dispatch-service', 'DOWN');

    const req4 = {
        path: '/api/v1/dispatch/schedule',
        targetService: 'mandi-dispatch-service',
        headers: {},
        query: {}
    };

    const res4 = router.resolveRoute(req4);
    console.log(`   📍 Rule Applied: ${res4.rule} | Result Route: "${res4.path}"`);

    if (res4.rule === 'FAILOVER_SERVICE_DOWN' && res4.path === '/api/v1/fallback-offline-mode') {
        console.log('   ✅ PASS: Unhealthy service traffic dynamically routed to fallback offline controller.');
        console.log('\n🎉 SUCCESS: All Dynamic Routing checks passed!');
    } else {
        console.error('   ❌ FAIL: Failover redirect failed to block down service.');
        process.exit(1);
    }
};

runVerification();
