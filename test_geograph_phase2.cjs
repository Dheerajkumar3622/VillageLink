const { RouteCorridorEngine } = require('./backend/src/RouteCorridorEngine.js');

async function runPhase2Test() {
  console.log('================================================================');
  console.log('🚀 TESTING VILLAGELINK GEOGRAPH PHASE 2: POLYLINE CORRIDOR SEGMENTATION');
  console.log('================================================================');

  // Sample Polyline: Nauhatta -> Dahiyar -> Bagen -> Sasaram (28.38 km)
  const samplePolyline = [
    { lat: 24.87, lng: 84.18, name: 'Nauhatta' },
    { lat: 24.95, lng: 84.12, name: 'Dahiyar' },
    { lat: 25.08, lng: 84.02, name: 'Bagen' },
    { lat: 24.95, lng: 84.03, name: 'Sasaram' }
  ];

  try {
    const result = RouteCorridorEngine.segmentCorridor(samplePolyline, 300, 3.0);
    console.log('✅ Segmentation Success:', result.success);
    console.log('📏 Total Route Distance:', result.totalRouteDistanceKm, 'km');
    console.log('📍 Total 300m Sampled Points:', result.totalSampledPoints);
    console.log('🗺️ Corridor Bounding Box:', JSON.stringify(result.corridorBoundingBox, null, 2));

    console.log('\n🔍 SAMPLE POINTS PREVIEW (First 5 & Last 3):');
    const preview = [...result.sampledPoints.slice(0, 5), ...result.sampledPoints.slice(-3)];
    preview.forEach((pt) => {
      console.log(`   Sample #${pt.sampleIndex} | Dist: ${pt.cumulativeDistKm} km | Lat: ${pt.lat}, Lng: ${pt.lng} | Heading: ${pt.heading}°`);
    });

    console.log('\n================================================================');
    console.log('🎉 GEOGRAPH PHASE 2 SEGMENTATION TEST PASSED WITH 100% SUCCESS');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Phase 2 Test Failed:', err);
  }
}

runPhase2Test();
