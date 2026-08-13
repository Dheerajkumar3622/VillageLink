const { MerchantOSEngine } = require('./backend/src/merchantOsEngine');
const { RuralDeliveryMeshEngine } = require('./backend/src/ruralDeliveryMeshEngine');

async function runVerificationPhase5() {
  console.log('====================================================');
  console.log('     UCE PHASE 5 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  // Test 1: Merchant Need Signal Publication
  console.log('[1/3] Testing Merchant Need Signal Asynchronous Publication...');
  const merchantSignalData = {
    merchantId: 'STORE_PATNA_MEDICAL_99',
    merchantName: 'Patna Central Medical Hall',
    pickupLocation: { lat: 25.5941, lng: 85.1376, address: 'Patna Pharma Market' },
    dropLocation: { lat: 25.5560, lng: 84.6603, address: 'Ara Clinic' },
    itemType: 'Medicine',
    weightKg: 4,
    volumeL: 12,
    priority: 'High',
    maxBudget: 280
  };

  const udoSignal = await MerchantOSEngine.publishNeedSignal(merchantSignalData);

  console.log(` -> Generated UDO ID: ${udoSignal.demandId}`);
  console.log(` -> Type: ${udoSignal.demandType} | Priority: ${udoSignal.priority} | Pickup H3: ${udoSignal.pickupLocation.h3Index}`);

  if (!udoSignal.demandId.startsWith('UDO_MERCHANT_') || udoSignal.demandType !== 'Medicine') {
    throw new Error('Merchant Need Signal publication test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 2: AI Merchant Pickup Prediction
  console.log('[2/3] Testing AI Merchant Pickup Prediction Engine...');
  const prediction = MerchantOSEngine.predictMerchantPickups('STORE_PATNA_MEDICAL_99', 12);

  console.log(` -> Merchant ID: ${prediction.merchantId}`);
  console.log(` -> Predicted Packages: ${prediction.predictedPackageCount} | Predicted Total Weight: ${prediction.predictedTotalWeightKg}kg`);
  console.log(` -> AI Confidence Score: ${prediction.confidenceScore}%`);

  if (prediction.confidenceScore < 80 || prediction.predictedPackageCount < 1) {
    throw new Error('Merchant pickup prediction test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 3: Community Pickup Hubs & Smart Locker OTP Verification
  console.log('[3/3] Testing Community Hubs & Smart Locker OTP Verification...');
  const hubs = RuralDeliveryMeshEngine.getNearbyCommunityHubs(25.5941, 85.1376);
  console.log(` -> Nearby Verified Community Hubs Count: ${hubs.length}`);
  hubs.forEach(h => console.log(`    - ${h.hubName} (${h.hubType})`));

  // Test OTP Verification for Smart Locker
  const lockerResSuccess = RuralDeliveryMeshEngine.verifyLockerOtp('HUB_ARA_PANCHAYAT', '8492');
  const lockerResFail = RuralDeliveryMeshEngine.verifyLockerOtp('HUB_ARA_PANCHAYAT', '0000');

  console.log(` -> Locker OTP Check '8492': Verified = ${lockerResSuccess.verified} (${lockerResSuccess.message})`);
  console.log(` -> Locker OTP Check '0000': Verified = ${lockerResFail.verified} (${lockerResFail.message})`);

  if (!lockerResSuccess.verified || lockerResFail.verified || hubs.length === 0) {
    throw new Error('Rural Delivery Mesh test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 5 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerificationPhase5().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
