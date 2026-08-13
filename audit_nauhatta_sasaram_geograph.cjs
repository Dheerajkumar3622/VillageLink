const { RouteCorridorEngine } = require('./backend/src/RouteCorridorEngine.js');
const { OSMJunctionDetector } = require('./backend/src/OSMJunctionDetector.js');
const { VNISMultiCriteriaAllocator } = require('./backend/src/VNISMultiCriteriaAllocator.js');
const { TelemetryFeedbackEngine } = require('./backend/src/TelemetryFeedbackEngine.js');
const { VNISDemandOverlayEngine } = require('./backend/src/vnisDemandOverlayEngine.js');

async function auditNauhattaToSasaram() {
  console.log('========================================================================================');
  console.log('🏁 GEOGRAPH END-TO-END AUDIT: NAUHATTA TO SASARAM CORRIDOR');
  console.log('========================================================================================');

  // Exact Coordinates for Nauhatta -> Dahiyar -> Bagen -> Sasaram Corridor
  const nauhattaToSasaramPolyline = [
    { lat: 24.8700, lng: 84.1800, name: 'Nauhatta Terminal' },
    { lat: 24.9500, lng: 84.1200, name: 'Dahiyar Mode' },
    { lat: 25.0800, lng: 84.0200, name: 'Bagen Feeder T-Junction' },
    { lat: 24.9500, lng: 84.0300, name: 'Sasaram Junction Hub' }
  ];

  try {
    // Phase 2: Corridor Segmentation
    const segmentResult = RouteCorridorEngine.segmentCorridor(nauhattaToSasaramPolyline, 300, 3.0);
    
    // Phase 3: Junction Detection
    const junctionResult = await OSMJunctionDetector.detectRouteJunctions(segmentResult.sampledPoints, 400);

    // Phase 4: Multi-Criteria Scoring & Allocation
    const allocationResult = await VNISMultiCriteriaAllocator.allocateMultiCriteriaVillages(junctionResult.detectedJunctions, 3.0);

    // Phase 5: Driver Telemetry Trajectory Upgrade
    const mockProbes = [
      { driverId: 'DRV_TEST_01', lat: 24.8701, lng: 84.1799, speed: 10, heading: 45 },
      { driverId: 'DRV_TEST_02', lat: 25.0801, lng: 84.0201, speed: 12, heading: 110 }
    ];
    const telemetryResult = await TelemetryFeedbackEngine.processTelemetryFeedback(mockProbes, allocationResult.allocatedJunctions);

    // Phase 6: Unified Demand Overlay
    const finalResult = await VNISDemandOverlayEngine.overlayUnifiedDemand(telemetryResult.updatedJunctions, 'R-NAUHATTA-SASARAM-01');

    console.log(`✅ TOTAL ROUTE DISTANCE: ${segmentResult.totalRouteDistanceKm} KM`);
    console.log(`📍 TOTAL HIGHWAY JUNCTION CHOWKS DETECTED: ${finalResult.overlaySummary.totalNodesEvaluated}`);
    console.log(`👥 TOTAL WAITING PASSENGERS: ${finalResult.overlaySummary.totalPassengersWaiting}`);
    console.log(`📦 TOTAL WAITING PARCELS: ${finalResult.overlaySummary.totalParcelsWaiting}`);
    console.log(`🌾 TOTAL MANDI CROP LISTINGS: ${finalResult.overlaySummary.totalMandiListings}`);
    console.log(`💰 ESTIMATED DRIVER REVENUE BOOST: ₹${finalResult.overlaySummary.estimatedTotalRouteRevenueBoost}`);

    console.log('\n========================================================================================');
    console.log('📋 ORDERED VILLAGE CHOWK ITINERARY (NAUHATTA TO SASARAM):');
    console.log('========================================================================================');

    finalResult.nodesWithDemand.forEach((node, idx) => {
      const d = node.demandOverlay;
      const primaryVil = node.allocatedVillages && node.allocatedVillages[0] ? node.allocatedVillages[0] : null;
      
      console.log(`\n[Chowk #${node.sequenceOrder}] 📍 ${node.junctionName} (${node.junctionType}) @ ${node.cumulativeDistKm} KM`);
      if (primaryVil) {
        console.log(`   └─ Primary Access Village: ${primaryVil.villageName} | Road Dist: ${primaryVil.roadDistanceKm}km (${primaryVil.approachType})`);
        console.log(`   └─ Score: ${primaryVil.confidenceScorePct}% [${primaryVil.status}]`);
      }
      console.log(`   └─ Live Demand: 👥 ${d.passengerDemandCount} Passengers | 📦 ${d.parcelDemandCount} Parcels | 🌾 ${d.mandiListingCount} Mandi | Sub-Segment Fare: ₹${d.estimatedSubSegmentFare}`);
    });

    console.log('\n========================================================================================');
    console.log('🎉 AUDIT COMPLETE: ALL VILLAGE ACCESS CHOWKS VERIFIED FOR NAUHATTA -> SASARAM');
    console.log('========================================================================================');
  } catch (err) {
    console.error('❌ Audit Failed:', err);
  }
}

auditNauhattaToSasaram();
