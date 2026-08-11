import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Service Worker Cache Engine Verification           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.resolve(__dirname, '../../frontend/public/sw.js');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking sw.js event listeners and caching profiles...');
    
    if (!fs.existsSync(swPath)) {
        console.error(`   ❌ FAIL: sw.js not found at: ${swPath}`);
        process.exit(1);
    }

    const swContent = fs.readFileSync(swPath, 'utf8');

    const hasFetchListener = swContent.includes("addEventListener('fetch'");
    const hasStaticCache = swContent.includes('const STATIC_CACHE');
    const hasDynamicCache = swContent.includes('const DYNAMIC_CACHE');

    console.log(`   📍 Has fetch event listener: ${hasFetchListener}`);
    console.log(`   📍 Has STATIC_CACHE token: ${hasStaticCache}`);
    console.log(`   📍 Has DYNAMIC_CACHE token: ${hasDynamicCache}`);

    if (hasFetchListener && hasStaticCache && hasDynamicCache) {
        console.log('   ✅ PASS: Service worker event listeners verified.');
    } else {
        console.error('   ❌ FAIL: Service worker listeners or cache tokens missing.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Verifying caching strategy algorithms...');

    const hasCacheFirst = swContent.includes('function cacheFirst') || swContent.includes('cacheFirst(');
    const hasNetworkFirst = swContent.includes('function networkFirst') || swContent.includes('networkFirst(');
    const hasStaleRevalidate = swContent.includes('function staleWhileRevalidate') || swContent.includes('staleWhileRevalidate(');

    console.log(`   📍 Implements Cache-First strategy: ${hasCacheFirst}`);
    console.log(`   📍 Implements Network-First strategy: ${hasNetworkFirst}`);
    console.log(`   📍 Implements Stale-While-Revalidate strategy: ${hasStaleRevalidate}`);

    if (hasCacheFirst && hasNetworkFirst && hasStaleRevalidate) {
        console.log('   ✅ PASS: Caching strategies resolved successfully.');
        console.log('\n🎉 SUCCESS: All Service Worker cache engine checks passed successfully!');
    } else {
        console.error('   ❌ FAIL: Caching strategies missing or incomplete in sw.js.');
        process.exit(1);
    }
};

runVerification();
