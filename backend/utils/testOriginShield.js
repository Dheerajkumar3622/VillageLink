console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Origin Shielding Security Validation Suite       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const TARGET_URL = 'http://localhost:3001/api/geodns/resolve?state=Bihar';
const CORRECT_SECRET = 'shield_v3_secure_village_secret';

const testDirectTrafficBlocked = async () => {
    console.log('\n🚫 Simulating Direct (Unshielded) Request...');
    try {
        const res = await fetch(TARGET_URL, {
            headers: {
                'x-shield-test-mode': 'true' // enforce test mode validation
            }
        });
        
        const data = await res.json();
        console.log(`   📍 HTTP Status: ${res.status}`);
        console.log(`   📍 Response Body:`, JSON.stringify(data));

        if (res.status === 403) {
            console.log('   ✅ PASS: Direct traffic was successfully BLOCKED by the shield firewall.');
            return true;
        } else {
            console.error('   ❌ FAIL: Direct traffic was NOT blocked!');
            return false;
        }
    } catch (e) {
        console.error('   ❌ Connection Error:', e.message);
        return false;
    }
};

const testShieldedTrafficAllowed = async () => {
    console.log('\n🟢 Simulating CDN Shielded Request (With Signature)...');
    try {
        const res = await fetch(TARGET_URL, {
            headers: {
                'x-shield-test-mode': 'true',
                'x-origin-shield-signature': CORRECT_SECRET
            }
        });
        
        const data = await res.json();
        console.log(`   📍 HTTP Status: ${res.status}`);
        console.log(`   📍 Response Body:`, JSON.stringify(data));

        if (res.status === 200 && data.success) {
            console.log('   ✅ PASS: Shielded traffic was successfully ALLOWED by the origin.');
            return true;
        } else {
            console.error('   ❌ FAIL: Shielded traffic was blocked or returned error!');
            return false;
        }
    } catch (e) {
        console.error('   ❌ Connection Error:', e.message);
        return false;
    }
};

const runAllTests = async () => {
    const directOk = await testDirectTrafficBlocked();
    const shieldedOk = await testShieldedTrafficAllowed();

    if (directOk && shieldedOk) {
        console.log('\n🎉 SUCCESS: All Origin Shielding firewall validation checks passed!');
    } else {
        console.error('\n❌ FAILURE: Origin Shielding firewall security checks failed.');
        process.exit(1);
    }
};

runAllTests().catch(err => console.error(err));
