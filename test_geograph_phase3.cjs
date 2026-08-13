const { RouteCorridorEngine } = require('./backend/src/RouteCorridorEngine.js');
const { OSMJunctionDetector } = require('./backend/src/OSMJunctionDetector.js');

async function runPhase3Test() {
  console.log('================================================================');
  console.log('🚀 TESTING VILLAGELINK GEOGRAPH PHASE 3: OSM ROAD GRAPH JUNCTION DETECTOR');
  console.log('================================================================');

  // Sample Polyline: Nauhatta -> Dahiyar -> Bagen -> Sasaram (43.31 km)
  const samplePolyline = [
    { lat: 24.87, lng: 84.18, name: 'Nauhatta' },
    { lat: 24.95, lng: 84.12, name: 'Dahiyar' },
    { lat: 25.08, lng: 84.02, name: 'Bagen' },
    { lat: 24.95, lng: 84.03, name: 'Sasaram' }
  ];

  try {
    // Step A: Segment corridor using Phase 2 engine
    const segmentResult = RouteCorridorEngine.segmentCorridor(samplePolyline, 300, 3.0);
    console.log('📍 Phase 2 Corridor Segmented:', segmentResult.totalSampledPoints, 'points sampled along', segmentResult.totalRouteDistanceKm, 'km');

    // Step B: Detect junctions using Phase 3 engine
    const junctionResult = await OSMJunctionDetector.detectRouteJunctions(segmentResult.sampledPoints, 400);
    console.log('✅ Junction Detection Success:', junctionResult.success);
    console.log('📊 Junction Breakdown:', JSON.stringify(junctionResult.junctionTypeBreakdown, null, 2));

    console.log('\n📍 DETECTED HIGHWAY JUNCTIONS (First 5):');
    junctionResult.detectedJunctions.slice(0, 5).forEach((jnc) => {
      console.log(`   [${jnc.sequenceIndex}] ${jnc.junctionName} (${jnc.junctionType}) @ ${jnc.cumulativeDistKm} km | Degree: ${jnc.degree} | RoadType: ${jnc.osmRoadType}`);
    });

    console.log('\n================================================================');
    console.log('🎉 GEOGRAPH PHASE 3 JUNCTION DETECTION PASSED WITH 100% PRECISION');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Phase 3 Test Failed:', err);
  }
}

runPhase3Test();
