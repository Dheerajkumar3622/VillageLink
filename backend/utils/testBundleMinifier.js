import { BundleMinifier } from './bundleMinifier.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Static Bundle Minification Verification          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const minifier = new BundleMinifier();

    const rawJS = `
    // Retrieve rider identification token from state
    let riderIdentityToken = localStorage.getItem("token");

    /* 
       Locate pickup coordinate data and destination coordinate data 
       and calculate routing lines
    */
    function resolveRoute(pickupCoordinates, destinationCoordinates) {
        let resultSum = pickupCoordinates + destinationCoordinates; // calc sum
        return resultSum;
    }
    `;

    console.log('🔵 Test 1: Compressing verbose source code...');
    const result = minifier.minify(rawJS);

    console.log('   📍 Original Length:', result.originalLength, 'bytes');
    console.log('   📍 Minified Length:', result.minifiedLength, 'bytes');
    console.log('   📍 Saved Space:', result.savingsBytes, 'bytes');
    console.log('   📍 Compression Ratio:', result.compressionRatio + '%');
    console.log(`   📍 Compressed Code: "${result.minifiedCode}"`);

    // Assertions
    const hasComments = result.minifiedCode.includes('//') || result.minifiedCode.includes('/*');
    const hasVerboseToken = result.minifiedCode.includes('riderIdentityToken');
    const hasVerbosePickup = result.minifiedCode.includes('pickupCoordinates');

    if (!hasComments && !hasVerboseToken && !hasVerbosePickup && result.compressionRatio > 40) {
        console.log('\n   ✅ PASS: Comments stripped, variables mangled, and code spaces compacted.');
        console.log('\n🎉 SUCCESS: All Static bundle minification via esbuild checks passed!');
    } else {
        console.error('\n   ❌ FAIL: Code compression rules not met.');
        process.exit(1);
    }
};

runVerification();
