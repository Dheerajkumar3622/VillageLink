import { VarnishCache } from './varnishSimulator.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Varnish Cache Proxy HTTP Acceleration Test       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const proxy = new VarnishCache();
    
    let backendCallsCount = 0;
    const mockOriginFetcher = () => {
        backendCallsCount++;
        return { market: 'Wheat-Mandi', price: 2300 };
    };

    console.log('🔵 Test 1: Fetching public route for the first time (Cache Miss)...');
    
    const res1 = proxy.handleRequest('/api/v1/market-rates', mockOriginFetcher);
    console.log(`   📍 Proxy Status: ${res1.status}`);
    console.log(`   📍 Response Latency: ${res1.latencyMs}ms`);
    console.log(`   📍 Total Origin Server Queries: ${backendCallsCount}`);

    if (res1.status === 'MISS' && res1.latencyMs === 120 && backendCallsCount === 1) {
        console.log('   ✅ PASS: Cache miss successfully resolved; stored response to Varnish.');
    } else {
        console.error('   ❌ FAIL: Cache miss logic failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Sub-millisecond subsequent request (Cache Hit)...');

    const res2 = proxy.handleRequest('/api/v1/market-rates', mockOriginFetcher);
    console.log(`   📍 Proxy Status: ${res2.status}`);
    console.log(`   📍 Response Latency: ${res2.latencyMs}ms`);
    console.log(`   📍 Total Origin Server Queries: ${backendCallsCount}`);

    if (res2.status === 'HIT' && res2.latencyMs === 0.5 && backendCallsCount === 1) {
        console.log('   ✅ PASS: Served directly from Varnish memory cache under 1ms.');
    } else {
        console.error('   ❌ FAIL: Cache hit execution failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Requesting private profile views (VCL Pass Bypass)...');

    const res3 = proxy.handleRequest('/api/v1/user/profile', mockOriginFetcher);
    console.log(`   📍 Proxy Status: ${res3.status}`);
    console.log(`   📍 Response Latency: ${res3.latencyMs}ms`);
    console.log(`   📍 Total Origin Server Queries: ${backendCallsCount}`);

    if (res3.status === 'PASS' && res3.latencyMs === 120 && backendCallsCount === 2) {
        console.log('   ✅ PASS: Correctly matched VCL Varnish bypass rules.');
        console.log('\n🎉 SUCCESS: All Varnish Cache Engine checks passed!');
    } else {
        console.error('   ❌ FAIL: Did not bypass cache for private URL endpoint.');
        process.exit(1);
    }
};

runVerification();
