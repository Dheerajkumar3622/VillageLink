import { SsgIsrEngine } from './ssgIsrEngine.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               SSG and ISR Rendering Cache Verification         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const engine = new SsgIsrEngine();
    
    let simulatedDbPrice = 4200; // Database state price
    const mockDbFetcher = () => {
        return { price: simulatedDbPrice };
    };

    console.log('🔵 Test 1: Rendering non-cached page directory (CACHE_MISS)...');
    
    const res1 = engine.renderPage('/markets/mandi-wheat', mockDbFetcher);
    console.log(`   📍 Status: ${res1.status}`);
    console.log(`   📍 Rendered Markup: "${res1.html}"`);

    if (res1.status === 'CACHE_MISS' && res1.html.includes('4200')) {
        console.log('   ✅ PASS: Compiled static HTML correctly on cache miss.');
    } else {
        console.error('   ❌ FAIL: Incorrect status on initial compilation.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Instant subsequent page request (CACHE_HIT)...');

    // Update DB price in background (not synced yet)
    simulatedDbPrice = 4500;

    const res2 = engine.renderPage('/markets/mandi-wheat', mockDbFetcher);
    console.log(`   📍 Status: ${res2.status}`);
    console.log(`   📍 Rendered Markup: "${res2.html}"`);

    if (res2.status === 'CACHE_HIT' && res2.html.includes('4200')) {
        console.log('   ✅ PASS: Served fresh static file directly from memory cache.');
    } else {
        console.error('   ❌ FAIL: Failed to hit cache or served stale state prematurely.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Page request after TTL expiration (CACHE_STALE_REVALIDATING)...');

    // Wait 1.1s for TTL revalidation to exceed 1s limit
    setTimeout(() => {
        const res3 = engine.renderPage('/markets/mandi-wheat', mockDbFetcher);
        console.log(`   📍 Status: ${res3.status}`);
        console.log(`   📍 Rendered Markup: "${res3.html}" (Should return stale price 4200)`);

        if (res3.status === 'CACHE_STALE_REVALIDATING' && res3.html.includes('4200')) {
            console.log('   ✅ PASS: Served stale page immediately, successfully triggered background revalidation.');
        } else {
            console.error('   ❌ FAIL: Did not return stale static file correctly.');
            process.exit(1);
        }

        // Wait another 50ms for background revalidation write to finish
        setTimeout(() => {
            console.log('\n🔵 Test 4: Verify static HTML reflects background revalidated fresh price...');
            
            const res4 = engine.renderPage('/markets/mandi-wheat', mockDbFetcher);
            console.log(`   📍 Status: ${res4.status}`);
            console.log(`   📍 Rendered Markup: "${res4.html}" (Should return fresh price 4500)`);

            if (res4.status === 'CACHE_HIT' && res4.html.includes('4500')) {
                console.log('   ✅ PASS: Dynamic static page updated asynchronously in the background.');
                console.log('\n🎉 SUCCESS: All Static Site Generation with ISR checks passed!');
            } else {
                console.error('   ❌ FAIL: Background revalidation did not refresh page HTML.');
                process.exit(1);
            }
        }, 50);
    }, 1100);
};

runVerification();
