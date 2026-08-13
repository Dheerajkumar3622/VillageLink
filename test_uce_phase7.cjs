const { CorridorSimulatorEngine } = require('./backend/src/corridorSimulatorEngine');
const { AntiFraudShieldEngine } = require('./backend/src/antiFraudShieldEngine');

async function runVerificationPhase7() {
  console.log('====================================================');
  console.log('     UCE PHASE 7 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  // Test 1: Patna-Ara Corridor Simulation & Recovered Idle Capacity (RIC) Calculation
  console.log('[1/2] Running Patna-Ara-Buxar Liquidity Corridor Simulation...');
  const simResult = CorridorSimulatorEngine.runCorridorSimulation(10, 35);

  console.log(` -> Corridor: ${simResult.corridorName}`);
  console.log(` -> Simulated Drivers: ${simResult.simulatedDriversCount} | Simulated Demands: ${simResult.simulatedDemandsCount}`);
  console.log(` -> Matched Demands: ${simResult.matchedDemandsCount}`);
  console.log(` -> Recovered Idle Capacity (RIC): ${simResult.totalEmptyKmSaved} km empty return saved`);
  console.log(` -> Total Stacked Revenue Generated: ₹${simResult.totalDriverRevenueGenerated}`);
  console.log(` -> Average Capacity Utilization: ${simResult.averageCapacityUtilization}%`);

  if (simResult.matchedDemandsCount === 0 || simResult.totalEmptyKmSaved <= 0 || simResult.totalDriverRevenueGenerated <= 0) {
    throw new Error('Corridor Simulation test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 2: Telemetry Anti-Fraud Shield (Location Jump > 150 km/h)
  console.log('[2/2] Testing 30% Telemetry Anti-Fraud Shield (Fake GPS Detection)...');
  const now = Date.now();
  const lastLoc = { lat: 25.5941, lng: 85.1376, timestamp: now - (60 * 1000) }; // Patna 1 min ago
  
  // Normal Transit: 0.5 km in 1 min (~30 km/h)
  const normalLoc = { lat: 25.5980, lng: 85.1380, timestamp: now };
  const verifNormal = AntiFraudShieldEngine.verifyTelemetry('DRIVER_REAL_01', lastLoc, normalLoc);

  console.log(` -> Normal Telemetry: Speed = ${verifNormal.computedSpeedKmH} km/h | Fraud Flag: ${verifNormal.fraudFlag}`);

  // Impossible Location Jump: Patna to Ara (48km) in 1 min (~2880 km/h -> Fake GPS / Spoofing)
  const spoofedLoc = { lat: 25.5560, lng: 84.6603, timestamp: now };
  const verifSpoofed = AntiFraudShieldEngine.verifyTelemetry('DRIVER_SPOOF_02', lastLoc, spoofedLoc);

  console.log(` -> Spoofed Telemetry: Speed = ${verifSpoofed.computedSpeedKmH} km/h | Fraud Flag: ${verifSpoofed.fraudFlag}`);
  console.log(`    Anomaly Reason: "${verifSpoofed.anomalyReason}"`);

  if (verifNormal.fraudFlag || !verifSpoofed.fraudFlag || verifSpoofed.riskPenalty !== 40) {
    throw new Error('Anti-Fraud Telemetry Shield test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 7 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerificationPhase7().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
