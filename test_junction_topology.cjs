/**
 * Test Script for VNISJunctionTopologyEngine
 */

const { VNISJunctionTopologyEngine } = require('./backend/src/vnisJunctionTopologyEngine.ts');

function testJunctionTopologyEngine() {
  console.log('🧪 Testing Perpendicular Centerline Snapper & Junction Topology Classifier...');

  // 1. Test Perpendicular Foot of Normal Projection
  const snapResult = VNISJunctionTopologyEngine.calculatePerpendicularCenterlineSnap(
    25.5000, 84.1015, // OSM Node slightly offset from road
    25.4900, 84.1000, // Road P1
    25.5100, 84.1000  // Road P2
  );

  console.log('📍 Perpendicular Centerline Snap Result:', snapResult);

  // 2. Test T-Junction Turn Angle Classification (90 degree turn)
  const tJunctionResult = VNISJunctionTopologyEngine.classifyJunctionTopology(
    { lat: 25.5000, lng: 84.1000 },
    { lat: 25.5000, lng: 84.1100 },
    { lat: 25.5100, lng: 84.1100 }  // 90 degree turn
  );

  console.log('🛑 T-Junction Classification Result:', tJunctionResult);

  // 3. Test Y-Fork Branch Classification (45 degree turn)
  const yForkResult = VNISJunctionTopologyEngine.classifyJunctionTopology(
    { lat: 25.5000, lng: 84.1000 },
    { lat: 25.5000, lng: 84.1100 },
    { lat: 25.5070, lng: 84.1170 }  // 45 degree turn
  );

  console.log('🔀 Y-Fork Classification Result:', yForkResult);

  if (
    snapResult.snapLat &&
    tJunctionResult.junctionType === 'T_JUNCTION_CHOWK' &&
    yForkResult.junctionType === 'Y_FORK_BRANCH'
  ) {
    console.log('🎉 JUNCTION TOPOLOGY ENGINE TEST PASSED 100%!');
  } else {
    console.error('❌ Test failed!');
  }
}

testJunctionTopologyEngine();
