import { GeoBlockRateLimiter } from './geoBlockRateLimiter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               IP Geo-blocking and Rate Limit Verification      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const shield = new GeoBlockRateLimiter();
    const domesticIp = '103.45.22.12';
    const domesticIp2 = '103.88.99.41';
    const internationalIp = '185.220.10.5';

    console.log('🔵 Test 1: Processing domestic Indian IP address request...');
    
    const check1 = shield.processRequest(domesticIp);
    console.log(`   📍 Allowed: ${check1.allowed} | Status Code: ${check1.statusCode}`);

    if (check1.allowed && check1.statusCode === 200) {
        console.log('   ✅ PASS: Domestic request allowed past geographic boundary.');
    } else {
        console.error('   ❌ FAIL: Domestic request blocked.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Intercepting international IP address request (HTTP 403)...');

    const check2 = shield.processRequest(internationalIp);
    console.log(`   📍 Allowed: ${check2.allowed} | Status Code: ${check2.statusCode} | Reason: ${check2.reason}`);

    if (!check2.allowed && check2.statusCode === 403 && check2.reason === 'GEO_BLOCKED') {
        console.log('   ✅ PASS: Foreign request blocked at boundary correctly.');
    } else {
        console.error('   ❌ FAIL: Foreign request bypassed geographic filters.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Validating IP rate limit thresholds (HTTP 429)...');

    let allowedRequestsCount = 0;
    let rateBlockedTriggered = false;

    // Send 6 requests in a row
    for (let i = 0; i < 6; i++) {
        const check = shield.processRequest(domesticIp2);
        if (check.allowed) {
            allowedRequestsCount++;
        } else if (check.statusCode === 429 && check.reason === 'RATE_LIMIT_EXCEEDED') {
            rateBlockedTriggered = true;
        }
    }

    console.log(`   📍 Allowed domestic requests before limit: ${allowedRequestsCount}`);
    console.log(`   📍 Rate limit block triggered: ${rateBlockedTriggered}`);

    if (allowedRequestsCount === 5 && rateBlockedTriggered) {
        console.log('   ✅ PASS: Volumetric rate limit blocks and status codes verified.');
        console.log('\n🎉 SUCCESS: All IP Rate Limiting and Geo-blocking checks passed!');
    } else {
        console.error('   ❌ FAIL: Rate limit threshold checks failure.');
        process.exit(1);
    }
};

runVerification();
