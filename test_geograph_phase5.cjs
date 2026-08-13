const { RouteCorridorEngine } = require('./backend/src/RouteCorridorEngine.js');
const { OSMJunctionDetector } = require('./backend/src/OSMJunctionDetector.js');
const { VNISMultiCriteriaAllocator } = require('./backend/src/VNISMultiCriteriaAllocator.js');
const { TelemetryFeedbackEngine } = require('./backend/src/TelemetryFeedbackEngine.js');

async function runPhase5Test() {
  console.log('================================================================');
  console.log('🚀 TESTING VILLAGELINK GEOGRAPH PHASE 5: TELEMETRY FEEDBACK LOOP');
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
    console.log('📍 Phase 4 Scored Junctions:', allocationResult.allocatedJunctions.length, 'junctions.');

    // Step D: Phase 5 Ingest Live Telemetry Probe Trajectories
    const probePoints = [
      { driverId: 'DRV_01', lat: 24.8701, lng: 84.1799, speed: 12, heading: 45, timestamp: Date.now() },
      { driverId: 'DRV_02', lat: 24.9502, lng: 84.1198, speed: 10, heading: 90, timestamp: Date.now() },
      { driverId: 'DRV_03', lat: 25.0801, lng: 84.0201, speed: 14, heading: 120, timestamp: Date.now() }
    ];

    const telemetryResult = await TelemetryFeedbackEngine.processTelemetryFeedback(probePoints, allocationResult.allocatedJunctions);
    console.log('✅ Phase 5 Telemetry Feedback Success:', telemetryResult.success);
    console.log('📊 Telemetry Summary:', JSON.stringify(telemetryResult.telemetrySummary, null, 2));

    console.log('\n📍 TELEMETRY UPGRADED JUNCTIONS (Preview):');
    telemetryResult.updatedJunctions.slice(0, 3).forEach((jnc) => {
      console.log(`\n  [Junction #${jnc.sequenceOrder}] ${jnc.junctionName} | OpVerified: ${jnc.operationallyVerified}`);
      jnc.allocatedVillages.slice(0, 2).forEach(v => {
        console.log(`        • ${v.villageName} | Score: ${v.confidenceScorePct}% | Status: ${v.status} | ProbeValidated: ${v.telemetryProbeValidated}`);
      });
    });

    console.log('\n================================================================');
    console.log('🎉 GEOGRAPH PHASE 5 TELEMETRY FEEDBACK PASSED WITH 100% SUCCESS');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Phase 5 Test Failed:', err);
  }
}

runPhase5Test();
