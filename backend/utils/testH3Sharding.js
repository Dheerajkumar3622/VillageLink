import { latLngToH3, getKRing, searchSpatialShard } from './h3Sharding.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               H3 Geohash Hexagonal Sharding Validation         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runH3Tests = () => {
    const lat = 25.094;
    const lng = 84.015;

    // --- TEST 1: LAT/LNG TO HEXAGON MAPPING ---
    console.log(`🔵 Test 1: Converting coordinates (${lat}, ${lng}) to H3 Hexagon ID...`);
    const hexIndex = latLngToH3(lat, lng, 9);
    console.log(`   📍 H3 Hexagon String Key: ${hexIndex}`);

    if (hexIndex.startsWith('892685623')) {
        console.log('   ✅ PASS: Hexagon index generated successfully.');
    } else {
        console.error('   ❌ FAIL: Index signature mismatch.');
        process.exit(1);
    }

    // --- TEST 2: K-RING NEIGHBORS RESOLUTION ---
    console.log('\n🔵 Test 2: Resolving adjacent hexagonal neighbor ring (k-ring of size 1)...');
    const ring = getKRing(hexIndex);
    console.log(`   📍 Neighbors Count: ${ring.length} cells (1 center + 6 directions)`);
    ring.forEach((cell, idx) => {
        console.log(`      [Cell ${idx}]: ${cell}`);
    });

    if (ring.length === 7) {
        console.log('   ✅ PASS: Complete hexagonal k-ring resolved.');
    } else {
        console.error('   ❌ FAIL: Incomplete k-ring neighbors array.');
        process.exit(1);
    }

    // --- TEST 3: SPATIAL SHARD FILTER SEARCH ---
    console.log('\n🔵 Test 3: Running spatial-sharded search matches...');
    
    // Drivers array with various positions in Bihar
    const drivers = [
        { id: 'driver_sasaram_core', lat: 25.094, lng: 84.015 },     // Same center cell
        { id: 'driver_sasaram_north', lat: 25.104, lng: 84.015 },    // Direct neighbor cell (North offset dx=0, dy=1)
        { id: 'driver_dehrion_sone', lat: 25.134, lng: 84.015 },     // Too far out (Non-adjacent cell)
        { id: 'driver_patna_city', lat: 25.602, lng: 85.112 }        // Completely isolated cell
    ];

    const matchedDrivers = searchSpatialShard(drivers, lat, lng, 9);
    console.log(`   📍 Matching Drivers in Shard Ring: ${matchedDrivers.length} (Expected: 2)`);
    matchedDrivers.forEach(d => {
        console.log(`      -> Match found: [${d.id}] at (${d.lat}, ${d.lng})`);
    });

    const hasCore = matchedDrivers.some(d => d.id === 'driver_sasaram_core');
    const hasNorth = matchedDrivers.some(d => d.id === 'driver_sasaram_north');
    const hasFar = matchedDrivers.some(d => d.id === 'driver_dehrion_sone' || d.id === 'driver_patna_city');

    const test3Ok = matchedDrivers.length === 2 && hasCore && hasNorth && !hasFar;
    if (test3Ok) {
        console.log('   ✅ PASS: Spatial-sharded queries correctly filter local hexagons and neighbors only.');
    } else {
        console.error('   ❌ FAIL: Spatial search matching boundary mismatch.');
        process.exit(1);
    }

    if (test3Ok) {
        console.log('\n🎉 SUCCESS: All H3 hexagonal spatial sharding checks passed successfully!');
    } else {
        console.error('\n❌ FAILURE: H3 sharding checks failed.');
        process.exit(1);
    }
};

runH3Tests();
