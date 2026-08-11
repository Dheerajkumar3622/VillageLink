import { GatewayShield } from './apiGatewayShield.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               API Gateway Shielding Boundary Validation        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const shield = new GatewayShield();

    console.log('🔵 Test 1: Processing valid client request matching structural policies...');
    
    const req1 = {
        headers: {
            'content-length': '420',
            'authorization': 'Bearer eyJhbGciOi...',
            'x-villagelink-client': 'KisanApp-Android-v1.0'
        }
    };

    const result1 = shield.inspectRequest(req1);
    console.log(`   📍 Allowed: ${result1.allowed} | Status Code: ${result1.statusCode}`);

    if (result1.allowed && result1.statusCode === 200) {
        console.log('   ✅ PASS: Valid request successfully routed downstream.');
    } else {
        console.error('   ❌ FAIL: Valid request rejected at boundary.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Intercepting volumetric payload spike (HTTP 413)...');

    const req2 = {
        headers: {
            // 2 MB (limit is 1 MB)
            'content-length': '2097152',
            'authorization': 'Bearer eyJhbGciOi...',
            'x-villagelink-client': 'KisanApp-Android-v1.0'
        }
    };

    const result2 = shield.inspectRequest(req2);
    console.log(`   📍 Allowed: ${result2.allowed} | Status Code: ${result2.statusCode} | Reason: ${result2.reason}`);

    if (!result2.allowed && result2.statusCode === 413 && result2.reason === 'PAYLOAD_TOO_LARGE') {
        console.log('   ✅ PASS: Volumetric attack blocked at boundary before resource exhaustion.');
    } else {
        console.error('   ❌ FAIL: Volumetric attack bypassed boundary size check.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Intercepting request missing mandatory headers (HTTP 400)...');

    const req3 = {
        headers: {
            'content-length': '120',
            'authorization': 'Bearer eyJhbGciOi...'
            // Missing x-villagelink-client
        }
    };

    const result3 = shield.inspectRequest(req3);
    console.log(`   📍 Allowed: ${result3.allowed} | Status Code: ${result3.statusCode} | Reason: ${result3.reason}`);

    if (!result3.allowed && result3.statusCode === 400 && result3.reason === 'MISSING_HEADER_X-VILLAGELINK-CLIENT') {
        console.log('   ✅ PASS: Request missing mandatory client signature header blocked.');
    } else {
        console.error('   ❌ FAIL: Request missing headers allowed downstream.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Intercepting CORS Origin security violation (HTTP 403)...');

    const req4 = {
        headers: {
            'content-length': '120',
            'authorization': 'Bearer eyJhbGciOi...',
            'x-villagelink-client': 'KisanApp-Android-v1.0',
            'origin': 'https://hackers-village.com'
        }
    };

    const result4 = shield.inspectRequest(req4);
    console.log(`   📍 Allowed: ${result4.allowed} | Status Code: ${result4.statusCode} | Reason: ${result4.reason}`);

    if (!result4.allowed && result4.statusCode === 403 && result4.reason === 'CORS_VIOLATION') {
        console.log('   ✅ PASS: CORS boundary violation successfully intercepted.');
        console.log('\n🎉 SUCCESS: All API Gateway Shielding checks passed!');
    } else {
        console.error('   ❌ FAIL: CORS validation bypassed gateway rules.');
        process.exit(1);
    }
};

runVerification();
