import { registerMapFeature, renderTileToSVG, clearMapFeatures } from './vectorTileRenderer.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Local Vector Tile Map Rendering                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    clearMapFeatures();

    console.log('🔵 Phase 1: Registering road geometries and landmark points...');
    
    // Register Highway 2 (Sasaram-Patna link)
    registerMapFeature('highway_2', 'ROAD', 'Sasaram Link Highway', [
        [10, 20],
        [40, 30],
        [90, 80]
    ]);

    // Register active grain mandi warehouse
    registerMapFeature('mandi_warehouse', 'LANDMARK', 'Sasaram Grain Mandi', [
        [75, 45]
    ]);

    console.log('   ✅ Geometries registered.');

    // --- TEST 1: LIGHT THEME RENDER ---
    console.log('\n🔵 Test 1: Rendering map tile under LIGHT theme...');
    const svgLight = renderTileToSVG('LIGHT');

    const hasSvgTag = svgLight.includes('<svg viewBox="0 0 100 100"');
    const hasLightRoad = svgLight.includes('stroke="#6c757d"'); // Standard grey
    const hasLightMark = svgLight.includes('fill="#dc3545"'); // Crimson landmark

    console.log(`   📍 Has SVG tag: ${hasSvgTag}`);
    console.log(`   📍 Has Light theme road stroke: ${hasLightRoad}`);
    console.log(`   📍 Has Light theme landmark fill: ${hasLightMark}`);

    const test1Ok = hasSvgTag && hasLightRoad && hasLightMark;
    if (test1Ok) {
        console.log('   ✅ PASS: Vector geometries rendered with Light theme properties.');
    } else {
        console.error('   ❌ FAIL: Light theme rendering properties mismatch.');
        process.exit(1);
    }

    // --- TEST 2: DARK THEME RENDER ---
    console.log('\n🔵 Test 2: Rendering map tile under DARK theme...');
    const svgDark = renderTileToSVG('DARK');

    const hasDarkRoad = svgDark.includes('stroke="#39ff14"'); // Neon green road
    const hasDarkMark = svgDark.includes('fill="#ff007f"'); // Hot pink landmark

    console.log(`   📍 Has Dark theme road stroke: ${hasDarkRoad}`);
    console.log(`   📍 Has Dark theme landmark fill: ${hasDarkMark}`);

    const test2Ok = hasSvgTag && hasDarkRoad && hasDarkMark;
    if (test2Ok) {
        console.log('   ✅ PASS: Vector geometries rendered with Dark theme properties.');
        console.log('\n🎉 SUCCESS: All Local Vector Tile Map Rendering checks passed!');
    } else {
        console.error('   ❌ FAIL: Dark theme rendering properties mismatch.');
        process.exit(1);
    }
};

runVerification().catch(err => console.error(err));
