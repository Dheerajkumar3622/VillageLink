/**
 * Test Script for Sensor Dead-Reckoning Engine
 */

const { DeadReckoningEngine } = require('./frontend/services/deadReckoningEngine.ts');

function testDeadReckoning() {
  console.log('🧪 Testing Sensor Dead-Reckoning Engine...');

  const engine = new DeadReckoningEngine(25.5941, 85.1376);
  engine.setRoadPolyline([
    { lat: 25.5941, lng: 85.1376 },
    { lat: 25.6000, lng: 85.1400 },
    { lat: 25.6100, lng: 85.1500 }
  ]);

  const state1 = engine.updatePosition(1.0);
  console.log('📍 Extrapolated Kinetic State Step 1:', state1);

  const state2 = engine.updatePosition(1.0);
  console.log('📍 Extrapolated Kinetic State Step 2:', state2);

  if (state2.lat && state2.lng && state2.velocityKmH >= 0) {
    console.log('🎉 Sensor Dead-Reckoning Extrapolation Test Passed Successfully!');
  } else {
    console.error('❌ Test failed!');
  }
}

testDeadReckoning();
