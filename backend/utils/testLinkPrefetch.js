console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               HTTP Link Header Prefetch Validation Suite       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const TARGET_URL = 'http://localhost:3001/';

const verifyLinkHeaders = async () => {
    console.log('\n📡 Sending HTTP GET request to root index page...');
    
    try {
        const res = await fetch(TARGET_URL, {
            headers: {
                'x-origin-shield-signature': 'shield_v3_secure_village_secret'
            }
        });

        console.log(`   📍 HTTP Status Code: ${res.status}`);
        
        const linkHeader = res.headers.get('link');
        const diagnosticHeader = res.headers.get('x-link-prefetch');

        console.log(`   📍 X-Link-Prefetch:  ${diagnosticHeader || 'None'}`);
        console.log(`   📍 Link Header:      ${linkHeader || 'None'}`);

        if (diagnosticHeader === 'Active' && linkHeader) {
            console.log('   ✅ PASS: Diagnostic header active and Link header present.');

            const hasPrefetch = linkHeader.includes('rel=prefetch');
            const hasPreload = linkHeader.includes('rel=preload');

            if (hasPrefetch && hasPreload) {
                console.log('   ✅ PASS: Prefetch and Preload directives verified in Link payload.');
                console.log('\n🎉 SUCCESS: HTTP Link Header Prefetch checks passed successfully!');
            } else {
                console.error('   ❌ FAIL: Link header is missing required relation directives.');
                process.exit(1);
            }
        } else {
            console.error('   ❌ FAIL: Prefetch middleware did not attach correct headers.');
            process.exit(1);
        }
    } catch (e) {
        console.error('   ❌ Connection Error:', e.message);
        process.exit(1);
    }
};

verifyLinkHeaders();
