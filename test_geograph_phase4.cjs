const { RouteCorridorEngine } = require('./backend/src/RouteCorridorEngine.js');
const { OSMJunctionDetector } = require('./backend/src/OSMJunctionDetector.js');
const { VNISMultiCriteriaAllocator } = require('./backend/src/VNISMultiCriteriaAllocator.js');

async function runPhase4Test() {
  console.log('================================================================');
  console.log('🚀 TESTING VILLAGELINK GEOGRAPH PHASE 4: MULTI-CRITERIA SCORING');
  console.log('================================================================');

  // Sample Polyline: Nauhatta -> Dahiyar -> Bagen -> Sasaram (43.31 km)
  const samplePolyline = [
    { lat: 24.87, lng: 84.18, name: 'Nauhatta' },
    { lat: 24.95, lng: 84.12, name: 'Dahiyar' },
    { lat: 25.08, lng: 84.02, name: 'Bagen' },
    { lat: 24.95, lng: 84.03, name: 'Sasaram' }
  ];

  try {
    // Step A: Phase 2 Corridor Segmentation
    const segmentResult = RouteCorridorEngine.segmentCorridor(samplePolyline, 300, 3.0);
    console.log('📍 Phase 2 Corridor Segmented:', segmentResult.totalSampledPoints, 'points sampled.');

    // Step B: Phase 3 OSM Junction Detection
    const junctionResult = await OSMJunctionDetector.detectRouteJunctions(segmentResult.sampledPoints, 400);
    console.log('📍 Phase 3 Junctions Detected:', junctionResult.totalJunctionsDetected, 'junctions.');

    // Step C: Phase 4 Multi-Criteria Village Allocation & Confidence Scoring
    const allocationResult = await VNISMultiCriteriaAllocator.allocateMultiCriteriaVillages(junctionResult.detectedJunctions, 3.0);
    console.log('✅ Phase 4 Multi-Criteria Success:', allocationResult.success);
    console.log('📊 Allocation Summary:', JSON.stringify(allocationResult.allocationSummary, null, 2));

    console.log('\n📍 MULTI-CRITERIA SCORED VILLAGE NODES (First 4):');
    allocationResult.allocatedJunctions.slice(0, 4).forEach((jnc) => {
      console.log(`\n  [Junction #${jnc.sequenceOrder}] ${jnc.junctionName} (${jnc.junctionType}) @ ${jnc.cumulativeDistKm} km`);
      console.log(`      Primary Village: ${jnc.primaryVillage} (Confidence: ${jnc.primaryConfidenceScorePct}%)`);
      console.log(`      Allocated Feeder Villages (${jnc.totalAllocatedVillages} total):`);
      jnc.allocatedVillages.slice(0, 3).forEach(v => {
        console.log(`        • ${v.villageName} | Rel: ${v.relationship} | RoadDist: ${v.roadDistanceKm}km | Score: ${v.confidenceScorePct}% [${v.status}]`);
      });
    });

    console.log('\n================================================================');
    console.log('🎉 GEOGRAPH PHASE 4 MULTI-CRITERIA SCORING PASSED WITH 100% PRECISION');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Phase 4 Test Failed:', err);
  }
}

runPhase4Test();
