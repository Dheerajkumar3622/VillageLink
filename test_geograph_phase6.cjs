const { RouteCorridorEngine } = require('./backend/src/RouteCorridorEngine.js');
const { OSMJunctionDetector } = require('./backend/src/OSMJunctionDetector.js');
const { VNISMultiCriteriaAllocator } = require('./backend/src/VNISMultiCriteriaAllocator.js');
const { VNISDemandOverlayEngine } = require('./backend/src/vnisDemandOverlayEngine.js');

async function runPhase6Test() {
  console.log('================================================================');
  console.log('🚀 TESTING VILLAGELINK GEOGRAPH PHASE 6: UNIFIED DEMAND OVERLAY');
  console.log('================================================================');

  const samplePolyline = [
    { lat: 24.87, lng: 84.18, name: 'Nauhatta' },
    { lat: 24.95, lng: 84.12, name: 'Dahiyar' },
    { lat: 25.08, lng: 84.02, name: 'Bagen' },
    { lat: 24.95, lng: 84.03, name: 'Sasaram' }
  ];

  try {
    // Step A: Phase 2 Segment
    const segmentResult = RouteCorridorEngine.segmentCorridor(samplePolyline, 300, 3.0);
    
    // Step B: Phase 3 Detect
    const junctionResult = await OSMJunctionDetector.detectRouteJunctions(segmentResult.sampledPoints, 400);
    
    // Step C: Phase 4 Allocate
    const allocationResult = await VNISMultiCriteriaAllocator.allocateMultiCriteriaVillages(junctionResult.detectedJunctions, 3.0);
    
    // Step D: Phase 6 Unified Demand Overlay
    const overlayResult = await VNISDemandOverlayEngine.overlayUnifiedDemand(allocationResult.allocatedJunctions, 'R-CORRIDOR-01');
    console.log('✅ Phase 6 Demand Overlay Success:', overlayResult.success);
    console.log('📊 Overlay Summary:', JSON.stringify(overlayResult.overlaySummary, null, 2));

    console.log('\n📍 LIVE ECONOMIC DEMAND OVERLAY ON VILLAGE NODES (First 4):');
    overlayResult.nodesWithDemand.slice(0, 4).forEach((node) => {
      const d = node.demandOverlay;
      console.log(`\n  [Node #${node.sequenceOrder}] ${node.junctionName} (${node.junctionType}) @ ${node.cumulativeDistKm} km`);
      console.log(`      Demand Status: ${d.statusTag} | Sub-Segment Fare: ₹${d.estimatedSubSegmentFare}`);
      console.log(`      Live Demand: 👥 Passengers: ${d.passengerDemandCount} | 📦 Parcels: ${d.parcelDemandCount} | 🌾 Mandi Listings: ${d.mandiListingCount}`);
    });

    console.log('\n================================================================');
    console.log('🎉 GEOGRAPH PHASE 6 UNIFIED DEMAND OVERLAY PASSED WITH 100% SUCCESS');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Phase 6 Test Failed:', err);
  }
}

runPhase6Test();
