import { WafShield } from './wafShield.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               WAF Layer-7 Security Shield Validation           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const waf = new WafShield();

    console.log('🔵 Test 1: Processing valid passenger booking payload...');
    
    const req1 = {
        body: {
            origin: 'Dumraon Village',
            destination: 'Buxar Basmati Mandi',
            passengersCount: 3
        },
        query: {}
    };

    const result1 = waf.inspectRequest(req1);
    console.log(`   📍 Blocked: ${result1.blocked}`);

    if (!result1.blocked) {
        console.log('   ✅ PASS: Clean request successfully passed the WAF inspection.');
    } else {
        console.error('   ❌ FAIL: Clean request blocked by WAF.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Intercepting SQL Injection attack in search parameters...');

    const req2 = {
        body: {
            searchField: "Basmati' OR '1'='1"
        },
        query: {}
    };

    const result2 = waf.inspectRequest(req2);
    console.log(`   📍 Blocked: ${result2.blocked} | Attack Signature: ${result2.attackType}`);

    if (result2.blocked && result2.attackType === 'SQL_INJECTION') {
        console.log('   ✅ PASS: SQL Injection attempt successfully intercepted.');
    } else {
        console.error('   ❌ FAIL: SQL Injection bypassed the WAF shield.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Intercepting Cross-Site Scripting (XSS) in comment form...');

    const req3 = {
        body: {
            driverNote: "Excellent service! <script>alert(document.cookie)</script>"
        },
        query: {}
    };

    const result3 = waf.inspectRequest(req3);
    console.log(`   📍 Blocked: ${result3.blocked} | Attack Signature: ${result3.attackType}`);

    if (result3.blocked && result3.attackType === 'XSS') {
        console.log('   ✅ PASS: XSS malicious script tag successfully intercepted.');
    } else {
        console.error('   ❌ FAIL: XSS attempt bypassed the WAF shield.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Intercepting Path Traversal request in query parameters...');

    const req4 = {
        body: {},
        query: {
            file: "../../../config/database.json"
        }
    };

    const result4 = waf.inspectRequest(req4);
    console.log(`   📍 Blocked: ${result4.blocked} | Attack Signature: ${result4.attackType}`);

    if (result4.blocked && result4.attackType === 'PATH_TRAVERSAL') {
        console.log('   ✅ PASS: Path Traversal attempt successfully intercepted.');
        console.log('\n🎉 SUCCESS: All WAF Security Shield checks passed!');
    } else {
        console.error('   ❌ FAIL: Path Traversal bypassed the WAF shield.');
        process.exit(1);
    }
};

runVerification();
