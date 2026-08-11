import { resolveGeoDNS } from './geoDNSResolver.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               GeoDNS Load Balancing Validation Suite           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const queries = [
    { state: 'Bihar', country: 'IN', expectedNode: 'KOLKATA' },
    { state: 'Maharashtra', country: 'IN', expectedNode: 'MUMBAI' },
    { state: 'Delhi', country: 'IN', expectedNode: 'DELHI-NCR' },
    { state: 'Karnataka', country: 'IN', expectedNode: 'BANGALORE' },
    { state: 'California', country: 'US', expectedNode: 'ANYCAST-HUB' }
];

const runGeoDnsTests = () => {
    let allPassed = true;

    queries.forEach(({ state, country, expectedNode }) => {
        console.log(`\n📡 Resolving GeoDNS lookup for user location: [State: "${state}", Country: "${country}"]...`);
        
        const pool = resolveGeoDNS(state, country);
        
        console.log(`   📍 Resolved Target Node:   "${pool.node}"`);
        console.log(`   📍 Resolved Target Region: "${pool.region}"`);
        console.log(`   📍 Assigned Endpoint IP:   ${pool.ip}`);

        if (pool.node === expectedNode) {
            console.log(`   ✅ PASS: Mapped correctly to ${expectedNode}.`);
        } else {
            console.error(`   ❌ FAIL: Mapped to ${pool.node} instead of ${expectedNode}.`);
            allPassed = false;
        }
    });

    if (allPassed) {
        console.log('\n🎉 SUCCESS: All GeoDNS geographic routing checks passed!');
    } else {
        console.error('\n❌ FAILURE: GeoDNS mapping mismatch detected.');
        process.exit(1);
    }
};

runGeoDnsTests();
