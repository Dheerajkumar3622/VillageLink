import { handleCommand, handleQuery } from './cqrsEngine.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               CQRS Segregation & Projection Validation          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const DRIVER_ID = 'driver_gaya_9302';

const runCqrsTests = () => {
    // --- TEST 1: CREATE TRIP (COMMAND -> PROJECTION -> QUERY SUMMARY) ---
    console.log('\n🔵 Test 1: Dispatching CreateTripCommand (Write Pathway)...');
    const cmd1 = {
        name: 'CreateTripCommand',
        payload: {
            tripId: 'trip_4001',
            driverId: DRIVER_ID,
            routeFrom: 'Gaya Mandi',
            routeTo: 'Patna Warehouse',
            distance: 110
        }
    };
    
    const res1 = handleCommand(cmd1);
    console.log(`   📍 Command execution status: ${res1.status}`);

    // Fetch projection status using Query pathway
    console.log('\n🔍 Querying Read Store (Read Pathway)...');
    const summary1 = handleQuery({
        name: 'GetDriverSummaryQuery',
        params: { driverId: DRIVER_ID }
    });

    console.log('   📍 Read View Output:');
    console.log(`      Active Trip ID: ${summary1.activeTripId}`);
    console.log(`      Total Distance: ${summary1.totalDistance} km`);
    console.log(`      Driver Status:  ${summary1.lastStatus}`);

    const test1Ok = res1.status === 'SUCCESS' && summary1.activeTripId === 'trip_4001' && summary1.totalDistance === 110;
    if (test1Ok) {
        console.log('   ✅ PASS: Command wrote successfully and projected to read-view.');
    } else {
        console.error('   ❌ FAIL: Write or projection failed.');
    }

    // --- TEST 2: ATTEMPT CONCURRENT ACTIVE TRIP (COMMAND REJECTION VALIDATION) ---
    console.log('\n🔵 Test 2: Dispatching concurrent CreateTripCommand for active driver...');
    const cmd2 = {
        name: 'CreateTripCommand',
        payload: {
            tripId: 'trip_4002',
            driverId: DRIVER_ID,
            routeFrom: 'Gaya Mandi',
            routeTo: 'Sasaram',
            distance: 90
        }
    };

    let test2Ok = false;
    try {
        handleCommand(cmd2);
        console.error('   ❌ FAIL: Server accepted active driver double booking!');
    } catch (e) {
        console.log(`   ✅ PASS: Business rule rejected double booking command as expected: "${e.message}"`);
        test2Ok = true;
    }

    // --- TEST 3: COMPLETE TRIP (COMMAND -> UPDATE PROJECTION) ---
    console.log('\n🔵 Test 3: Dispatching CompleteTripCommand...');
    const cmd3 = {
        name: 'CompleteTripCommand',
        payload: {
            tripId: 'trip_4001',
            driverId: DRIVER_ID
        }
    };

    const res3 = handleCommand(cmd3);
    const summary3 = handleQuery({
        name: 'GetDriverSummaryQuery',
        params: { driverId: DRIVER_ID }
    });

    console.log('\n🔍 Querying Read Store (After Completion):');
    console.log(`   📍 Active Trip ID: ${summary3.activeTripId || 'None'}`);
    console.log(`   📍 Driver Status:  ${summary3.lastStatus}`);

    const test3Ok = res3.status === 'SUCCESS' && summary3.activeTripId === null && summary3.lastStatus === 'COMPLETED';
    if (test3Ok) {
        console.log('   ✅ PASS: Completion command updated Read Store projection successfully.');
    } else {
        console.error('   ❌ FAIL: Completion update failed.');
    }

    // --- TEST 4: READ PIPELINE LATENCY BENCHMARK ---
    console.log('\n🔵 Test 4: Running Query Read-Store Latency Benchmark (1000 fast queries)...');
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        handleQuery({
            name: 'GetDriverSummaryQuery',
            params: { driverId: DRIVER_ID }
        });
    }
    const duration = performance.now() - start;
    const avgLatency = (duration / 1000).toFixed(4);
    console.log(`   📍 Total duration for 1000 queries: ${duration.toFixed(2)} ms`);
    console.log(`   📍 Average latency per query:       ${avgLatency} ms`);

    const test4Ok = duration < 50; // Read store should respond in a few milliseconds overall
    if (test4Ok) {
        console.log('   ✅ PASS: Read Store Queries achieved sub-millisecond response metrics.');
    } else {
        console.error('   ❌ FAIL: High query latency detected.');
    }

    if (test1Ok && test2Ok && test3Ok && test4Ok) {
        console.log('\n🎉 SUCCESS: All CQRS separation and projection latency tests passed!');
    } else {
        console.error('\n❌ FAILURE: CQRS architecture validation failed.');
        process.exit(1);
    }
};

runCqrsTests();
