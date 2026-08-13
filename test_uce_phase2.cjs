const { RouteSegmentationEngine } = require('./backend/src/routeSegmentationEngine');

async function runVerificationPhase2() {
  console.log('====================================================');
  console.log('     UCE PHASE 2 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  // Sample Corridor Stops: Patna -> Ara -> Buxar -> Varanasi
  const driverStops = [
    { stopName: 'Patna', lat: 25.5941, lng: 85.1376 },
    { stopName: 'Ara', lat: 25.5560, lng: 84.6603 },
    { stopName: 'Buxar', lat: 25.5647, lng: 83.9777 },
    { stopName: 'Varanasi', lat: 25.3176, lng: 82.9739 }
  ];

  // Test 1: Route Segmentation & Capacity Vector Calculation
  console.log('[1/3] Testing Multi-Stop Route Segmentation (A -> B -> C -> D)...');
  const segments = RouteSegmentationEngine.segmentRoute(driverStops, 3, 50, 200);

  console.log(` -> Total Stops: ${driverStops.length} | Generated Sub-Segments: ${segments.length}`);
  segments.forEach((seg, idx) => {
    console.log(`    Seg ${idx + 1}: ${seg.fromStop.stopName} -> ${seg.toStop.stopName} (${seg.distanceKm} km, ~${seg.estimatedDurationMin} mins) [Seats: ${seg.availableSeats}, Weight: ${seg.availableWeightKg}kg]`);
  });

  if (segments.length !== 3 || segments[0].availableSeats !== 3 || segments[1].fromStop.stopName !== 'Ara') {
    throw new Error('Route Segmentation test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 2: 100% & Partial Trajectory Overlap Matching
  console.log('[2/3] Testing Corridor Trajectory Overlap Calculation...');

  // Demand 1: Patna -> Buxar (Matches Segments 0 and 1)
  const demandPatnaBuxar = {
    pickup: { lat: 25.5941, lng: 85.1376 }, // Patna
    drop: { lat: 25.5647, lng: 83.9777 }    // Buxar
  };

  const matchRes1 = RouteSegmentationEngine.calculateTrajectoryOverlap(
    driverStops,
    demandPatnaBuxar.pickup,
    demandPatnaBuxar.drop
  );

  console.log(` -> Demand (Patna -> Buxar) Overlap: ${matchRes1.overlapPercentage}% | Detour: ${matchRes1.detourDistanceKm} km | Matched Segs: [${matchRes1.matchedSegments.join(', ')}]`);

  if (!matchRes1.isMatched || matchRes1.matchedSegments.length !== 2) {
    throw new Error('Trajectory Overlap test 1 failed!');
  }

  // Demand 2: Ara -> Buxar (Matches Segment 1)
  const demandAraBuxar = {
    pickup: { lat: 25.5560, lng: 84.6603 }, // Ara
    drop: { lat: 25.5647, lng: 83.9777 }    // Buxar
  };

  const matchRes2 = RouteSegmentationEngine.calculateTrajectoryOverlap(
    driverStops,
    demandAraBuxar.pickup,
    demandAraBuxar.drop
  );

  console.log(` -> Demand (Ara -> Buxar) Overlap: ${matchRes2.overlapPercentage}% | Detour: ${matchRes2.detourDistanceKm} km | Matched Segs: [${matchRes2.matchedSegments.join(', ')}]`);

  if (!matchRes2.isMatched || matchRes2.matchedSegments.length !== 1) {
    throw new Error('Trajectory Overlap test 2 failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 3: Disjoint Corridor Trajectory Filtering (0% Match)
  console.log('[3/3] Testing Disjoint Trajectory Filtering (0% Match)...');
  const demandDarbhangaMuzaffarpur = {
    pickup: { lat: 26.1542, lng: 85.8918 }, // Darbhanga (Different Corridor)
    drop: { lat: 26.1209, lng: 85.3647 }    // Muzaffarpur
  };

  const matchRes3 = RouteSegmentationEngine.calculateTrajectoryOverlap(
    driverStops,
    demandDarbhangaMuzaffarpur.pickup,
    demandDarbhangaMuzaffarpur.drop
  );

  console.log(` -> Demand (Darbhanga -> Muzaffarpur) Matched: ${matchRes3.isMatched} | Overlap: ${matchRes3.overlapPercentage}%`);

  if (matchRes3.isMatched) {
    throw new Error('Disjoint Trajectory Filtering test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 2 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerificationPhase2().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
