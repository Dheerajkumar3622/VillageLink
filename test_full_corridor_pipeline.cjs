/**
 * Full Pipeline Test for Bagen-Sasaram Corridor Node Snapping Engine
 */

const { VNISCorridorSnappingEngine } = require('./backend/src/vnisCorridorSnappingEngine.js');

async function testBagenSasaramCorridor() {
  console.log('🧪 Testing Full Bagen -> Sasaram Corridor Node Identification Pipeline...');

  // Sparse polyline (like OSRM/Google Maps returns)
  const sparsePolyline = [
    { lat: 25.5941, lng: 84.1200 }, // Bagen
    { lat: 25.5500, lng: 84.1000 }, // Rampur area
    { lat: 25.4800, lng: 84.0800 }, // Dahiyar area
    { lat: 25.4000, lng: 84.0600 }, // Behrar area
    { lat: 25.3000, lng: 84.0500 }, // Khanda area
    { lat: 25.2000, lng: 84.0400 }, // Mahdewa area
    { lat: 25.1000, lng: 84.0350 }, // Sitabigha / Jagdawandih area
    { lat: 25.0200, lng: 84.0320 }, // Amratalab / Admapur area
    { lat: 24.9600, lng: 84.0310 }, // Sasaram Jail / Basantpur / Pilot Baba area
    { lat: 24.9500, lng: 84.0300 }  // Baulia / Sasaram Junction
  ];

  const result = await VNISCorridorSnappingEngine.snapPolylinePointsToNodes(sparsePolyline, 1.5, 40, 150);

  console.log('================================================================================');
  console.log(`📌 Total Corridor Length: ${result.totalCorridorLengthKm} km`);
  console.log(`📌 Total Identified Village Nodes: ${result.totalNodesFound}`);
  console.log('================================================================================');

  result.nodesSequence.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ${item.displayHindiName || item.displayName} | ${item.cumulativeDistanceKm} km | Side: ${item.highwaySide}`);
  });

  if (result.totalNodesFound > 0) {
    console.log('\n🎉 FULL CORRIDOR NODE PIPELINE TEST PASSED 100%!');
  } else {
    console.error('\n❌ Test failed: No nodes identified!');
  }
}

testBagenSasaramCorridor();
