const { UniversalCapacityWalletEngine } = require('./backend/src/universalCapacityWalletEngine');
const { RicAnalyticsEngine } = require('./backend/src/ricAnalyticsEngine');

async function runVerificationPhase8() {
  console.log('====================================================');
  console.log('     UCE PHASE 8 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  const userId = 'DRIVER_RAMESH_PATNA';

  // Test 1: Universal Capacity Wallet Multi-Domain Consolidation
  console.log('[1/2] Testing Universal Capacity Wallet Multi-Domain Consolidation...');
  
  UniversalCapacityWalletEngine.creditEarnings(userId, 300, 'PASSENGER', 'Patna -> Ara Passenger Ride');
  UniversalCapacityWalletEngine.creditEarnings(userId, 220, 'PARCEL', 'Patna -> Ara Grocery Parcel Co-load');
  UniversalCapacityWalletEngine.creditEarnings(userId, 180, 'MEDICINE', 'Patna Pharma Hub Emergency Medicine');
  UniversalCapacityWalletEngine.creditEarnings(userId, 450, 'MANDI', 'Buxar Mandi Wheat Delivery');
  UniversalCapacityWalletEngine.creditEarnings(userId, 150, 'INCENTIVE', 'Patna-Ara High Capacity Utilization Bonus');

  const walletSummary = UniversalCapacityWalletEngine.getWalletBalance(userId);

  console.log(` -> Driver ID: ${walletSummary.userId}`);
  console.log(` -> Total Stacked Wallet Balance: ₹${walletSummary.totalBalance}`);
  console.log(`    - Passenger: ₹${walletSummary.categoryBreakdown.passengerEarnings}`);
  console.log(`    - Parcel: ₹${walletSummary.categoryBreakdown.parcelEarnings}`);
  console.log(`    - Medicine: ₹${walletSummary.categoryBreakdown.medicineEarnings}`);
  console.log(`    - Mandi: ₹${walletSummary.categoryBreakdown.mandiEarnings}`);
  console.log(`    - Incentives: ₹${walletSummary.categoryBreakdown.incentiveEarnings}`);

  if (walletSummary.totalBalance !== 1300 || walletSummary.recentTransactions.length !== 5) {
    throw new Error('Universal Capacity Wallet test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 2: Platform North Star Metrics (RIC & CUI Telemetry)
  console.log('[2/2] Testing Platform North Star Metrics (RIC & CUI Telemetry)...');
  const metrics = RicAnalyticsEngine.getPlatformMetrics();

  console.log(` -> North Star Metric - Recovered Idle Capacity (RIC): ${metrics.recoveredIdleCapacityKmSaved} km empty return saved`);
  console.log(` -> Capacity Utilization Index (CUI): ${metrics.capacityUtilizationIndexPercentage}%`);
  console.log(` -> Monetized Unused Idle Value: ₹${metrics.monetizedIdleCapacityValueINR}`);
  console.log(` -> Empty Distance Reduction: ${metrics.emptyKmReductionPercentage}%`);

  if (metrics.recoveredIdleCapacityKmSaved <= 0 || metrics.capacityUtilizationIndexPercentage < 50) {
    throw new Error('RIC & CUI Telemetry test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 8 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerificationPhase8().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
