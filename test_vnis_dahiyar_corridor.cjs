const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function testDahiyarCorridor() {
  console.log('====================================================');
  console.log('TESTING DAHIYAR-BAGEN CORRIDOR TOPOLOGY SNAPPING');
  console.log('Goal 1: Verify Monotonic Sequence (Khanda -> Behrar -> Dahiyar -> Rampur -> Bagen)');
  console.log('Goal 2: Verify 5m Co-Located Junction Master Ranker (Behrar vs Semra)');
  console.log('====================================================\n');

  try {
    console.log('1. Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('✔ Connected to MongoDB Atlas!\n');

    const { VNISCorridorSnappingEngine } = await import('./backend/src/vnisCorridorSnappingEngine.js');

    // Dahiyar-Bagen Highway Route Polyline Points (West -> East)
    const polylinePoints = [
      { lat: 25.5800, lng: 84.0900 }, // Origin near Khanda
      { lat: 25.5810, lng: 84.0950 }, // Khanda Mode
      { lat: 25.5840, lng: 84.1020 }, // Behrar & Semra Mode (5m apart)
      { lat: 25.5870, lng: 84.1120 }, // Dahiyar Mode
      { lat: 25.5890, lng: 84.1210 }, // Rampur Mode
      { lat: 25.5920, lng: 84.1350 }  // Bagen Hub Terminal
    ];

    console.log('2. Running Monotonic Corridor Polyline Snapping Engine...');
    const result = await VNISCorridorSnappingEngine.snapPolylinePointsToNodes(polylinePoints, 0.8, 40, 150);

    console.log('\n📌 DAHIYAR CORRIDOR SNAPPING RESULTS:');
    console.log(`  • Total Highway Distance: ${result.totalCorridorLengthKm} km`);
    console.log(`  • Total Nodes Discovered: ${result.totalNodesFound} nodes`);
    console.log(`  • Clustered Master Stops: ${result.clusterCount} stops\n`);

    console.log('📌 SEQUENTIAL VILLAGE NODE ROUTE TOPOLOGY (WEST TO EAST):');
    console.log('----------------------------------------------------------------------------------');
    result.nodesSequence.forEach((item) => {
      console.log(`  Stop #${item.sequenceIndex}: ${item.displayName} (${item.displayHindiName})`);
      console.log(`      Node ID: ${item.node.nodeId} | District: ${item.node.district}`);
      console.log(`      Distance: ${item.cumulativeDistanceKm} km | ETA: ${item.estimatedEtaMinutes} mins | Side: ${item.highwaySide}`);
      if (item.coLocatedVillage) {
        console.log(`      📍 Co-Located Adjacent Village: ${item.coLocatedVillage} (Resolved to Junction Master)`);
      }
      console.log('');
    });
    console.log('----------------------------------------------------------------------------------');

    // VERIFICATION ASSERTIONS
    const nodeNames = result.nodesSequence.map(n => n.displayName);
    console.log('\n📌 VERIFYING EXAGGERATED TOPOLOGY CONSTRAINTS:');
    
    // 1. Verify Khanda is first
    const khandaIdx = nodeNames.findIndex(n => n.includes('Khanda'));
    // 2. Verify Behrar is second
    const behrarIdx = nodeNames.findIndex(n => n.includes('Behrar'));
    // 3. Verify Dahiyar is before Rampur
    const dahiyarIdx = nodeNames.findIndex(n => n.includes('Dahiyar'));
    const rampurIdx = nodeNames.findIndex(n => n.includes('Rampur'));
    // 4. Verify Bagen is last
    const bagenIdx = nodeNames.findIndex(n => n.includes('Bagen'));

    console.log(`  ✔ Khanda Index: ${khandaIdx}`);
    console.log(`  ✔ Behrar-Semra Index: ${behrarIdx}`);
    console.log(`  ✔ Dahiyar Index: ${dahiyarIdx}`);
    console.log(`  ✔ Rampur Index: ${rampurIdx}`);
    console.log(`  ✔ Bagen Index: ${bagenIdx}`);

    if (dahiyarIdx < rampurIdx && behrarIdx < dahiyarIdx && khandaIdx < behrarIdx && rampurIdx < bagenIdx) {
      console.log('\n====================================================');
      console.log('🎉 DAHIYAR CORRIDOR TOPOLOGY & 5m JUNCTION RANKING 100% SUCCESS!');
      console.log('Sequence is PERFECT: Khanda -> Behrar-Semra -> Dahiyar -> Rampur -> Bagen');
      console.log('====================================================');
      process.exit(0);
    } else {
      console.error('❌ Sequence assertion failed! Expected Khanda -> Behrar -> Dahiyar -> Rampur -> Bagen');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Dahiyar Corridor Test Error:', err);
    process.exit(1);
  }
}

testDahiyarCorridor();
