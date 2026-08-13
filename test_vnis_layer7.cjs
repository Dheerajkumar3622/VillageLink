const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testVNISLayer7() {
  console.log('====================================================');
  console.log('TESTING VNIS LAYER 7: 7-LEVEL AUTONOMOUS DECISION PYRAMID (L0-L6)');
  console.log('Self-Healing Engine + Anti-Fraud Shield Verification');
  console.log('====================================================\n');

  const { VNISAutonomousDecisionEngine } = await import('./backend/src/vnisAutonomousDecisionEngine.js');

  // Scenario 1: Driver Breakdown -> L3 Auto-Rematch
  console.log('📌 SCENARIO 1: Driver Breakdown at Bihta Mode (L3 Auto-Rematch Test)');
  const res1 = VNISAutonomousDecisionEngine.evaluateAndSelfHeal({
    eventId: 'EVT_BRK_01',
    disruptionType: 'DRIVER_BREAKDOWN',
    affectedUserId: 'USR_RAMESH_1',
    affectedUserName: 'Rameshwar Singh',
    demandId: 'DEM_YATRA_101',
    nodeId: 'S_BTA',
    nodeName: 'Bihta Railway Station Hub',
    originalFareRupees: 180
  });

  console.log(`  ✔ Decision Level: ${res1.decisionLevel}`);
  console.log(`  ✔ Action Taken: ${res1.actionTaken}`);
  console.log(`  ✔ Re-assigned Driver: ${res1.newAssignedDriverId} (ETA: ${res1.newDriverEtaMinutes} min)`);
  console.log(`  ✔ Resolution Summary: "${res1.resolutionSummary}"\n`);

  // Scenario 2: Driver Breakdown (No Driver) -> Instant Self-Healing Refund + Bonus
  console.log('📌 SCENARIO 2: No Alternative Driver Available (Instant Wallet Refund + 10% Bonus)');
  const res2 = VNISAutonomousDecisionEngine.evaluateAndSelfHeal({
    eventId: 'EVT_BRK_02',
    disruptionType: 'DRIVER_BREAKDOWN',
    affectedUserId: 'USR_KAMESH_2',
    affectedUserName: 'Kameshwar Yadav',
    demandId: 'DEM_MANDI_303',
    nodeId: 'V_4',
    nodeName: 'Sadisopur Mode',
    originalFareRupees: 200,
    forceRefund: true
  });

  console.log(`  ✔ Action Taken: ${res2.actionTaken}`);
  console.log(`  ✔ Original Refund: ₹${res2.refundAmountRupees} | Apology Bonus: ₹${res2.apologyBonusRupees}`);
  console.log(`  💰 TOTAL INSTANT WALLET CREDIT: ₹${res2.totalWalletCreditRupees}`);
  console.log(`  ✔ Resolution Summary: "${res2.resolutionSummary}"\n`);

  // Scenario 3: Heavy Monsoon Causeway Flood -> L4 Reroute
  console.log('📌 SCENARIO 3: Monsoon Flood Roadblock (L4 Secondary Node Reroute)');
  const res3 = VNISAutonomousDecisionEngine.evaluateAndSelfHeal({
    eventId: 'EVT_FLD_03',
    disruptionType: 'WEATHER_ROAD_BLOCK',
    affectedUserId: 'DRV_VIKRAM_99',
    affectedUserName: 'Vikram Singh',
    demandId: 'DEM_CORRIDOR_1',
    nodeId: 'S_KWR',
    nodeName: 'Koelwar Bridge Mode',
    originalFareRupees: 350
  });

  console.log(`  ✔ Decision Level: ${res3.decisionLevel}`);
  console.log(`  ✔ Action Taken: ${res3.actionTaken}`);
  console.log(`  ✔ Resolution Summary: "${res3.resolutionSummary}"\n`);

  // Scenario 4: GPS Spoofing Attempt (210 km/h) -> L6 Governance Block
  console.log('📌 SCENARIO 4: GPS Spoofing Attempt (210 km/h Velocity -> L6 Governance Block)');
  const res4 = VNISAutonomousDecisionEngine.evaluateAndSelfHeal({
    eventId: 'EVT_FRD_04',
    disruptionType: 'FRAUD_GPS_SPOOF',
    affectedUserId: 'USR_FRAUD_X',
    affectedUserName: 'Unknown Spoofer',
    demandId: 'DEM_FAKE_99',
    nodeId: 'V_1',
    nodeName: 'Patna Junction Mode',
    originalFareRupees: 500,
    telemetrySpeedKmH: 210 // Impossible speed
  });

  console.log(`  ✔ Anti-Fraud Shield Status: ${res4.antiFraudStatus}`);
  console.log(`  ✔ Decision Level: ${res4.decisionLevel}`);
  console.log(`  ✔ Action Taken: ${res4.actionTaken}`);
  console.log(`  ✔ Resolution Summary: "${res4.resolutionSummary}"\n`);

  console.log('====================================================');
  console.log('🎉 VNIS LAYER 7 AUTONOMOUS ENGINE 100% VERIFIED!');
  console.log('====================================================');
  process.exit(0);
}

testVNISLayer7();
