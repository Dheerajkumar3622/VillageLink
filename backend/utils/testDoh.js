import { resolveHostnameDoH } from './dohResolver.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               DNS over HTTPS (DoH) Validation Suite            ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const targets = [
    'api.razorpay.com',
    'api.github.com',
    'dns.google'
];

const runDohQueries = async () => {
    for (const host of targets) {
        console.log(`\n📡 Resolving secure domain queries for: "${host}"...`);
        const start = performance.now();
        
        try {
            const ips = await resolveHostnameDoH(host);
            const duration = performance.now() - start;
            
            if (ips && ips.length > 0) {
                console.log(`   ✅ Success! Resolved in ${duration.toFixed(1)} ms.`);
                console.log(`   📍 IP Addresses: [${ips.join(', ')}]`);
            } else {
                console.error(`   ❌ Failed: Received empty IP list.`);
            }
        } catch (e) {
            console.error(`   ❌ Error during DoH query:`, e.message);
        }
    }
    console.log('\n🎉 DoH validation check complete.');
};

runDohQueries().catch(err => console.error(err));
