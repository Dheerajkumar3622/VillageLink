import { PredictiveDispatcher } from './predictiveDispatch.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Predictive Dispatching Fleet Relocation Validation║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const dispatcher = new PredictiveDispatcher();

    console.log('🔵 Test 1: Querying predicted high-demand centers for Tuesday Morning...');
    
    const zones = dispatcher.predictDemandZones('Morning', 'Tuesday');

    console.log(`   📍 Total predicted hubs found: ${zones.length}`);
    zones.forEach((z, i) => {
        console.log(`     [Hub ${i + 1}] "${z.zoneName}" | Coordinates: (${z.lat}, ${z.lng}) | Demand Weight: ${z.demandWeight}`);
    });

    const test1Ok = zones.length === 2 && 
                    zones[0].zoneName === 'Buxar Basmati Mandi' && 
                    zones[1].zoneName === 'Dumraon Seed Depot';

    if (test1Ok) {
        console.log('   ✅ PASS: Historical logs successfully filtered and ordered by demand weight.');
    } else {
        console.error('   ❌ FAIL: Demand zone prediction ranking mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Positioning idle driver to closest predicted demand hub...');

    // Driver location (25.53, 84.10) - closer to Dumraon (25.52, 84.15) than Buxar (25.56, 84.01)
    const driverId = 'Logistics-Truck-44';
    const dispatchPlan = dispatcher.dispatchPreemptively(driverId, 25.53, 84.10, zones);

    console.log(`   📍 Dispatch Target: "${dispatchPlan.targetZone}"`);
    console.log(`   📍 Target Coordinates: (${dispatchPlan.targetCoords.lat}, ${dispatchPlan.targetCoords.lng})`);
    console.log(`   📍 Distance to Hub: ${dispatchPlan.computedDistance.toFixed(4)}`);

    const test2Ok = dispatchPlan !== null &&
                    dispatchPlan.driverId === driverId &&
                    dispatchPlan.targetZone === 'Dumraon Seed Depot';

    if (test2Ok) {
        console.log('   ✅ PASS: Idle vehicle successfully positioned to closest demand center.');
        console.log('\n🎉 SUCCESS: All Predictive Dispatching checks passed!');
    } else {
        console.error('   ❌ FAIL: Preemptive routing distance matching failed.');
        process.exit(1);
    }
};

runVerification();
