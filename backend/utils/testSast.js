import { SastAuditor } from './sastAudit.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               SAST Code Auditing Vulnerability Verification   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const auditor = new SastAuditor();

    console.log('🔵 Test 1: Auditing structurally secure parameterized code...');
    
    const secureCode = `
        import db from 'db';
        const apiKey = process.env.API_KEY;
        
        async function fetchBooking(bookingId) {
            return await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        }
    `;

    const res1 = auditor.auditContent('secureService.js', secureCode);
    console.log(`   📍 Passed Audit: ${res1.pass} | Violations found: ${res1.findings.length}`);

    if (res1.pass && res1.findings.length === 0) {
        console.log('   ✅ PASS: Clean source file passed SAST inspection successfully.');
    } else {
        console.error('   ❌ FAIL: Secure code incorrectly flagged with violations.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Scanning for hardcoded credentials (CRITICAL)...');

    const credentialLeakCode = `
        // Insecure configuration
        const session_secret = "super_secret_session_token_123456";
        const port = 3000;
    `;

    const res2 = auditor.auditContent('config.js', credentialLeakCode);
    console.log(`   📍 Passed Audit: ${res2.pass} | Severity: ${res2.findings[0]?.severity} | Rule: ${res2.findings[0]?.rule}`);

    if (!res2.pass && res2.findings[0]?.rule === 'HARDCODED_SECRET') {
        console.log('   ✅ PASS: Hardcoded token assignment successfully detected.');
    } else {
        console.error('   ❌ FAIL: Hardcoded credential leak bypassed SAST audit.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Scanning for unsafe dynamic evaluation context (HIGH)...');

    const evalCode = `
        function parseInput(expr) {
            return eval(expr);
        }
    `;

    const res3 = auditor.auditContent('parser.js', evalCode);
    console.log(`   📍 Passed Audit: ${res3.pass} | Severity: ${res3.findings[0]?.severity} | Rule: ${res3.findings[0]?.rule}`);

    if (!res3.pass && res3.findings[0]?.rule === 'UNSAFE_EVAL') {
        console.log('   ✅ PASS: Unsafe eval() statement successfully detected.');
    } else {
        console.error('   ❌ FAIL: Unsafe eval statement bypassed SAST audit.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Scanning for SQL injection risk template interpolation (HIGH)...');

    const sqliCode = `
        function searchCrops(cropName) {
            return db.query(\`SELECT * FROM crops WHERE name = '\${cropName}'\`);
        }
    `;

    const res4 = auditor.auditContent('cropsModel.js', sqliCode);
    console.log(`   📍 Passed Audit: ${res4.pass} | Severity: ${res4.findings[0]?.severity} | Rule: ${res4.findings[0]?.rule}`);

    if (!res4.pass && res4.findings[0]?.rule === 'SQL_INJECTION_RISK') {
        console.log('   ✅ PASS: Unsafe SQL concatenation query successfully detected.');
        console.log('\n🎉 SUCCESS: All SAST Code Auditing checks passed!');
    } else {
        console.error('   ❌ FAIL: SQL injection risk query bypassed SAST audit.');
        process.exit(1);
    }
};

runVerification();
