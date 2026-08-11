import { initTable, insertRow, queryPartition } from './wideColumnStore.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Wide-Column Partition Store Validation Suite      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const TABLE_NAME = 'driver_telemetry_partitions';
const DRIVER_ID = 'drv_sasaram_9381';

const runWideColumnTests = () => {
    // Initialize wide-column table schema
    initTable(TABLE_NAME, 'driverId', 'timestamp');

    console.log('\n🔵 Phase 1: Inserting rows with dynamic column layouts...');

    // Row 1: Standard coordinates (t = 1000)
    insertRow(TABLE_NAME, DRIVER_ID, 1000, { lat: 24.954, lng: 84.015 });
    
    // Row 2: coordinates + speed + engineTemp columns (t = 3000)
    insertRow(TABLE_NAME, DRIVER_ID, 3000, { lat: 24.960, lng: 84.020, speed: 60, engineTemp: 85 });
    
    // Row 3: Out-of-order insert (t = 2000) with custom fuelPct column to verify sorting
    insertRow(TABLE_NAME, DRIVER_ID, 2000, { lat: 24.957, lng: 84.018, fuelPct: 92 });

    console.log('   ✅ Insert complete.');

    // --- TEST 1: RANGE QUERY & SORTING VERIFICATION ---
    console.log(`\n🔵 Test 1: Querying Partition for "${DRIVER_ID}" within range [1500, 3500]...`);
    const results = queryPartition(TABLE_NAME, DRIVER_ID, 1500, 3500);

    console.log(`   📍 Returned Rows Count: ${results.length} (Expected: 2)`);
    results.forEach((row, i) => {
        console.log(`      [Row ${i + 1}]: Timestamp: ${row.timestamp}, Lat: ${row.lat}, Speed: ${row.speed || 'N/A'}, Fuel%: ${row.fuelPct || 'N/A'}`);
    });

    const test1Ok = results.length === 2 && 
                    results[0].timestamp === 2000 && 
                    results[1].timestamp === 3000 && 
                    results[0].fuelPct === 92 && 
                    results[1].speed === 60;

    if (test1Ok) {
        console.log('   ✅ PASS: Clustering key sorting and range querying verified successfully.');
    } else {
        console.error('   ❌ FAIL: Range query or clustering sort mismatch.');
    }

    // --- TEST 2: DYNAMIC COLUMN SCHEMA ISOLATION ---
    console.log('\n🔵 Test 2: Verifying dynamic columns mapping...');
    const fullPartition = queryPartition(TABLE_NAME, DRIVER_ID);
    console.log(`   📍 Total rows in partition: ${fullPartition.length}`);
    
    const row1 = fullPartition.find(r => r.timestamp === 1000);
    const row2 = fullPartition.find(r => r.timestamp === 3000);

    console.log(`      Row at t=1000 speed column exists? ${row1.speed !== undefined ? 'Yes' : 'No'}`);
    console.log(`      Row at t=3000 speed column exists? ${row2.speed !== undefined ? 'Yes' : 'No'}`);

    const test2Ok = row1 && row2 && row1.speed === undefined && row2.speed === 60;
    if (test2Ok) {
        console.log('   ✅ PASS: Schema-less dynamic columns isolated successfully.');
    } else {
        console.error('   ❌ FAIL: Dynamic column isolation mismatch.');
    }

    if (test1Ok && test2Ok) {
        console.log('\n🎉 SUCCESS: All Wide-Column Database partitioning and sorting tests passed!');
    } else {
        console.error('\n❌ FAILURE: Wide-Column validation failed.');
        process.exit(1);
    }
};

runWideColumnTests();
