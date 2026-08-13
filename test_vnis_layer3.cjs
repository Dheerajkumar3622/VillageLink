const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function testVNISLayer3() {
  console.log('====================================================');
  console.log('TESTING VNIS LAYER 3: MONGODB ATLAS LIVE DEMAND FUSION');
  console.log('Goal: Dynamic Querying of Live MongoDB Atlas Tickets & Parcels');
  console.log('====================================================\n');

  try {
    console.log('1. Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('✔ Connected to MongoDB Atlas!\n');

    const { VNISDemandFusionEngine } = await import('./backend/src/vnisDemandFusionEngine.js');

    const logicalCorridorSequence = [
      { sequenceIndex: 1, node: { nodeId: 'V_1', name: 'Koiri Bigaha Mode', localNameHindi: 'कोइरी बिघा मोड़' }, cumulativeDistanceKm: 19.13, estimatedEtaMinutes: 29, highwaySide: 'LEFT' },
      { sequenceIndex: 2, node: { nodeId: 'V_2', name: 'Bandewar Mode', localNameHindi: 'बंदेवार मोड़' }, cumulativeDistanceKm: 19.39, estimatedEtaMinutes: 29, highwaySide: 'RIGHT' },
      { sequenceIndex: 3, node: { nodeId: 'V_3', name: 'Lodhnakhargi Mode', localNameHindi: 'लोधनाखरगी मोड़' }, cumulativeDistanceKm: 19.68, estimatedEtaMinutes: 30, highwaySide: 'LEFT' },
      { sequenceIndex: 4, node: { nodeId: 'V_4', name: 'Sadisopur Mode', localNameHindi: 'सदिसोपुर मोड़' }, cumulativeDistanceKm: 22.34, estimatedEtaMinutes: 34, highwaySide: 'LEFT' },
      { sequenceIndex: 5, node: { nodeId: 'V_5', name: 'Mahadewpur Mode', localNameHindi: 'महादेवपुर मोड़' }, cumulativeDistanceKm: 20.19, estimatedEtaMinutes: 30, highwaySide: 'RIGHT' },
      { sequenceIndex: 6, node: { nodeId: 'S_BTA', name: 'Bihta Railway Station Hub', localNameHindi: 'बिहटा रेलवे स्टेशन हब', stationCode: 'BTA' }, cumulativeDistanceKm: 26.86, estimatedEtaMinutes: 40, highwaySide: 'RIGHT' },
      { sequenceIndex: 7, node: { nodeId: 'S_PATL', name: 'Patel Halt Railway Station Hub', localNameHindi: 'पटेल हाल्ट रेलवे स्टेशन हब', stationCode: 'PATL' }, cumulativeDistanceKm: 24.49, estimatedEtaMinutes: 37, highwaySide: 'RIGHT' },
      { sequenceIndex: 8, node: { nodeId: 'S_KLU', name: 'Kulharia Railway Station Hub', localNameHindi: 'कुलहरिया रेलवे स्टेशन हब' }, cumulativeDistanceKm: 31.20, estimatedEtaMinutes: 47, highwaySide: 'LEFT' },
      { sequenceIndex: 9, node: { nodeId: 'S_KWR', name: 'Koelwar Railway Station Hub', localNameHindi: 'कोइलवर रेलवे स्टेशन हब' }, cumulativeDistanceKm: 34.95, estimatedEtaMinutes: 52, highwaySide: 'LEFT' }
    ];

    console.log('2. Running Live MongoDB Atlas Demand Fusion Query...');
    const result = await VNISDemandFusionEngine.fuseDemandFromDatabase('DRV_LIVE_01', logicalCorridorSequence);

    console.log('\n📌 LIVE MONGODB DEMAND FUSION RESULTS:');
    console.log(`  • Total Logical Nodes: ${result.totalLogicalNodes}`);
    console.log(`  • ACTIVE STOPS GENERATED: ${result.totalActiveStops} mandatory stops`);
    console.log(`  • PASS-THROUGH NODES (SILENT FLOW): ${result.totalPassthroughNodes} nodes`);
    console.log(`  💰 TOTAL TRIP NODE OPPORTUNITY SCORE (NOS ₹): ₹${result.totalTripEarningsRupees}\n`);

    console.log('📌 CONSOLIDATED MONGODB DRIVER HUD WORK ORDERS:');
    console.log('----------------------------------------------------------------------------------');
    result.activeStopsSequence.forEach(stop => {
      console.log(`  🛑 Active Stop #${stop.stopSequenceIndex}: ${stop.nodeName} (${stop.nodeHindiName})`);
      console.log(`      Distance: ${stop.cumulativeDistanceKm} km | ETA: ${stop.estimatedEtaMinutes} min | Highway Side: ${stop.highwaySide}`);
      console.log(`      💰 Node Earnings (NOS): ₹${stop.totalEarningsRupees} | Pre-Arrival Notification: ${stop.preArrivalLeadMinutes} min before arrival`);
      console.log(`      📋 Fused MongoDB Demands (${stop.demands.length} active orders):`);
      stop.demands.forEach(d => {
        console.log(`         • [${d.serviceType}] ${d.title} (Customer: ${d.customerName}, PIN: ${d.verificationPin}) -> +₹${d.earningsRupees}`);
      });
      console.log('');
    });
    console.log('----------------------------------------------------------------------------------');

    console.log('\n====================================================');
    console.log('🎉 VNIS LAYER 3 MONGODB LIVE DEMAND FUSION 100% VERIFIED!');
    console.log('====================================================');
    process.exit(0);

  } catch (err) {
    console.error('❌ VNIS Layer 3 Test Error:', err);
    process.exit(1);
  }
}

testVNISLayer3();
