import { SecurityHeaders } from './securityHeaders.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Web Security Headers Policy Verification         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const middleware = new SecurityHeaders();

    // Mock response object mapping headers
    const mockHeaders = new Map();
    const mockResponse = {
        setHeader(name, value) {
            mockHeaders.set(name, value);
        }
    };

    console.log('🔵 Test 1: Running mock HTTP response through security header middleware...');
    
    middleware.apply(mockResponse);

    console.log('   📍 Injected Response Headers:');
    for (const [name, value] of mockHeaders.entries()) {
        console.log(`      • ${name}: "${value}"`);
    }

    // Assertions
    const hasCsp = mockHeaders.has('Content-Security-Policy');
    const hasHsts = mockHeaders.has('Strict-Transport-Security');
    const hasFrame = mockHeaders.get('X-Frame-Options') === 'DENY';
    const hasContentType = mockHeaders.get('X-Content-Type-Options') === 'nosniff';
    const hasXss = mockHeaders.get('X-XSS-Protection') === '1; mode=block';

    if (hasCsp && hasHsts && hasFrame && hasContentType && hasXss) {
        console.log('\n   ✅ PASS: CSP, HSTS, Frame-Options, nosniff, and XSS blocks successfully injected.');
        console.log('\n🎉 SUCCESS: All Web Security Headers integration checks passed!');
    } else {
        console.error('\n   ❌ FAIL: One or more critical security headers are missing or configured incorrectly.');
        process.exit(1);
    }
};

runVerification();
