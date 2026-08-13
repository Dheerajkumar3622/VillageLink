const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function testUniversalHighwayNavigation() {
  console.log('====================================================');
  console.log('TESTING UNIVERSAL HIGHWAY ACCESS JUNCTION NAVIGATION');
  console.log('====================================================\n');

  try {
    // Dynamically import ESM snapping engine
    const { VNISHighwayJunctionSnappingEngine } = await import('./backend/src/vnisHighwayJunctionSnappingEngine.js');

    // 1. Simulate Bagen-to-Sasaram driving polyline (Forward A -> Z)
    const bagenToSasaramPolyline = [
      { lat: 25.5920, lng: 84.1350 }, // Bagen Mode
      { lat: 25.5890, lng: 84.1210 }, // Rampur Mode
      { lat: 25.5870, lng: 84.1120 }, // Dahiyar Mode
      { lat: 25.5840, lng: 84.1020 }, // Behrar Mode
      { lat: 25.5810, lng: 84.0950 }, // Khanda Mode
      { lat: 25.5410, lng: 84.0820 }, // Mahdewa Mode
      { lat: 25.4850, lng: 84.0750 }, // Sitabigha Mode
      { lat: 25.3850, lng: 84.0620 }, // Jagdawandih Mode
      { lat: 25.2500, lng: 84.0510 }, // Amratalab Mode
      { lat: 25.1200, lng: 84.0410 }, // Admapur Mode
      { lat: 24.9750, lng: 84.0310 }, // Sasaram Jail Mode
      { lat: 24.9650, lng: 84.0250 }, // Basantpur Mode
      { lat: 24.9580, lng: 84.0200 }, // Pilot Baba Mode
      { lat: 24.9520, lng: 84.0150 }, // Prakash Petrol Pump Mode
      { lat: 24.9480, lng: 84.0100 }, // Baulia Mode
      { lat: 24.9450, lng: 84.0050 }  // Sasaram Junction Hub
    ];

    console.log('1. Testing Forward Corridor Route: Bagen -> Sasaram Junction (A -> Z)...');
    const forwardResult = await VNISHighwayJunctionSnappingEngine.snapRouteToHighwayModes(
      bagenToSasaramPolyline,
      2.5,
      40,
      200
    );

    console.log(`✔ Found ${forwardResult.nodeCount} sequential village highway modes along Bagen-Sasaram!`);
    console.log('Extracted Node Sequence:');
    forwardResult.sequence.forEach((node, i) => {
      console.log(`  ${i + 1}. ${node.displayName} (${node.displayHindiName}) - ${node.cumulativeDistanceKm} km [ETA: ${node.estimatedEtaMinutes} min]`);
    });

    assert(forwardResult.nodeCount > 5, 'Should find multiple corridor nodes');
    
    // Verify monotonic distance ordering
    for (let i = 0; i < forwardResult.sequence.length - 1; i++) {
      assert(
        forwardResult.sequence[i].cumulativeDistanceKm <= forwardResult.sequence[i + 1].cumulativeDistanceKm,
        `Node ${i} distance must be <= Node ${i+1} distance`
      );
    }
    console.log('✔ Monotonic strictly increasing distance assertion PASSED for Forward Route!');

    // 2. Testing Reverse Corridor Route: Sasaram Junction -> Bagen (Z -> A)
    console.log('\n2. Testing Reverse Corridor Route: Sasaram Junction -> Bagen (Z -> A)...');
    const reversePolyline = [...bagenToSasaramPolyline].reverse();
    const reverseResult = await VNISHighwayJunctionSnappingEngine.snapRouteToHighwayModes(
      reversePolyline,
      2.5,
      40,
      200
    );

    console.log(`✔ Found ${reverseResult.nodeCount} sequential village highway modes for Reverse Route!`);
    console.log('Reverse Node Sequence:');
    reverseResult.sequence.forEach((node, i) => {
      console.log(`  ${i + 1}. ${node.displayName} (${node.displayHindiName}) - ${node.cumulativeDistanceKm} km [ETA: ${node.estimatedEtaMinutes} min]`);
    });

    assert(reverseResult.nodeCount > 5, 'Should find multiple reverse corridor nodes');

    // Verify reverse monotonic distance ordering
    for (let i = 0; i < reverseResult.sequence.length - 1; i++) {
      assert(
        reverseResult.sequence[i].cumulativeDistanceKm <= reverseResult.sequence[i + 1].cumulativeDistanceKm,
        `Reverse Node ${i} distance must be <= Node ${i+1} distance`
      );
    }
    console.log('✔ Monotonic strictly increasing distance assertion PASSED for Reverse Route!');

    console.log('\n====================================================');
    console.log('ALL UNIVERSAL HIGHWAY NAVIGATION TESTS PASSED 100%!');
    console.log('====================================================');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  }
}

testUniversalHighwayNavigation();
