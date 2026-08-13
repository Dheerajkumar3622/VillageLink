/**
 * Unit Test for VNISMonotonicArcLengthEngine (Zero-Swap Precision Benchmark)
 */

const { VNISMonotonicArcLengthEngine } = require('./backend/src/vnisMonotonicArcLengthEngine.ts');

function testZeroSwapMonotonicEngine() {
  console.log('🧪 Testing Monotonic 1D Arc-Length Engine for 0% Sequence Swapping...');

  // Curved road polyline from Bagen to Sasaram Junction
  const polyline = [
    { lat: 25.5941, lng: 84.1200 }, // Start (0 km)
    { lat: 25.5500, lng: 84.1000 },
    { lat: 25.4800, lng: 84.0800 },
    { lat: 25.4000, lng: 84.0600 },
    { lat: 25.3000, lng: 84.0500 },
    { lat: 24.9500, lng: 84.0300 }  // End (Sasaram)
  ];

  // Raw candidate nodes (unordered)
  const candidateNodes = [
    { nodeId: 'N-3', name: 'Dahiyar', lat: 25.4810, lng: 84.0805 },
    { nodeId: 'N-1', name: 'Bagen', lat: 25.5940, lng: 84.1201 },
    { nodeId: 'N-5', name: 'Khanda', lat: 25.3010, lng: 84.0505 },
    { nodeId: 'N-2', name: 'Rampur', lat: 25.5510, lng: 84.1005 },
    { nodeId: 'N-4', name: 'Behrar', lat: 25.4010, lng: 84.0605 },
    { nodeId: 'N-6', name: 'Sasaram Junction', lat: 24.9501, lng: 84.0301 }
  ];

  const result = VNISMonotonicArcLengthEngine.snapAndSortMonotonic(polyline, candidateNodes, 1000);

  console.log('📌 Monotonic Snapped Stops Result:');
  result.forEach((stop, idx) => {
    console.log(`   [${idx + 1}] ${stop.displayName} | ArcLength: ${stop.arcLengthKm} km | Side: ${stop.sideOrientation}`);
  });

  // Verify strict monotonic progression (s_0 < s_1 < s_2 < ...)
  let isStrictlyMonotonic = true;
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].arcLengthKm >= result[i + 1].arcLengthKm) {
      isStrictlyMonotonic = false;
      console.error(`❌ MONOTONIC FLIP DETECTED between ${result[i].name} and ${result[i + 1].name}`);
    }
  }

  if (isStrictlyMonotonic && result.length === candidateNodes.length) {
    console.log('🎉 ZERO-SWAP MONOTONIC TEST PASSED 100%!');
  } else {
    console.error('❌ Test failed!');
  }
}

testZeroSwapMonotonicEngine();
