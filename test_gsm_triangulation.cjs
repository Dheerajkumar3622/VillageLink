/**
 * Test Script for GSM Cell-Tower Triangulation Engine
 */

const { GSMTriangulationEngine } = require('./backend/src/gsmTriangulationEngine.ts');

async function testGSMTriangulation() {
  console.log('🧪 Testing GSM Cell-Tower Triangulation Engine...');

  const sampleTowers = [
    { mcc: 405, mnc: 86, lac: 1420, cid: 58210, signalStrengthDbm: -72 }, // Jio 4G Bihar Tower 1
    { mcc: 405, mnc: 86, lac: 1420, cid: 58211, signalStrengthDbm: -85 }  // Jio 4G Bihar Tower 2
  ];

  const result = await GSMTriangulationEngine.resolveLocation(sampleTowers);
  console.log('✅ Resolved GSM Coordinates:', result);

  if (result.lat && result.lng && result.accuracyMeters <= 350) {
    console.log('🎉 GSM Triangulation Test Passed Successfully!');
  } else {
    console.error('❌ Test failed!');
  }
}

testGSMTriangulation().catch(console.error);
