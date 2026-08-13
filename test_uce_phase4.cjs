const { DemandFusionEngine } = require('./backend/src/demandFusionEngine');
const { DynamicPricingEngine } = require('./backend/src/dynamicPricingEngine');

async function runVerificationPhase4() {
  console.log('====================================================');
  console.log('     UCE PHASE 4 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  const now = Date.now();

  // Driver UCO (Patna -> Ara, 3 seats, 50kg weight, 100L volume)
  const driverUCO = {
    capacityId: 'UCO_DRIVER_FUSION_01',
    ownerId: 'DRIVER_SURESH',
    vehicleId: 'BR01_XYZ_99',
    availableSeats: 3,
    availableWeightKg: 50,
    availableVolumeL: 100
  };

  // Qualified Opportunities Batch
  const opportunities = [
    {
      opportunityId: 'OPP_1',
      demandId: 'UDO_PASSENGER_01',
      demandType: 'Passenger',
      pickupAddress: 'Patna Junction',
      dropAddress: 'Ara Bus Stand',
      netExtraEarnings: 200,
      universalIntelligenceScore: 95
    },
    {
      opportunityId: 'OPP_2',
      demandId: 'UDO_MEDICINE_01',
      demandType: 'Medicine',
      pickupAddress: 'Patna Pharma Hub',
      dropAddress: 'Ara Clinic',
      netExtraEarnings: 350,
      universalIntelligenceScore: 92
    },
    {
      opportunityId: 'OPP_3',
      demandId: 'UDO_PARCEL_01',
      demandType: 'Parcel',
      pickupAddress: 'Patna Kirana',
      dropAddress: 'Ara Store',
      netExtraEarnings: 150,
      universalIntelligenceScore: 88
    }
  ];

  // Map of Demands
  const demandsMap = new Map([
    ['UDO_PASSENGER_01', { demandId: 'UDO_PASSENGER_01', demandType: 'Passenger', passengerCount: 1, weightKg: 0, volumeL: 0 }],
    ['UDO_MEDICINE_01', { demandId: 'UDO_MEDICINE_01', demandType: 'Medicine', passengerCount: 0, weightKg: 5, volumeL: 15 }],
    ['UDO_PARCEL_01', { demandId: 'UDO_PARCEL_01', demandType: 'Parcel', passengerCount: 0, weightKg: 10, volumeL: 25 }]
  ]);

  console.log('[1/2] Testing Multi-Demand Heterogeneous Co-Loading Fusion...');
  const fusedPlan = DemandFusionEngine.fuseDemands(driverUCO, opportunities, demandsMap);

  console.log(` -> Plan ID: ${fusedPlan.planId}`);
  console.log(` -> Fused Demands Count: ${fusedPlan.selectedDemands.length}`);
  console.log(` -> Total Stacked Revenue: ₹${fusedPlan.totalStackedEarnings} (Passenger ₹200 + Medicine ₹350 + Parcel ₹150)`);
  console.log(` -> Residual Capacity: ${fusedPlan.residualCapacity.remainingSeats} Seats, ${fusedPlan.residualCapacity.remainingWeightKg}kg Weight`);
  console.log(` -> Capacity Utilization: ${fusedPlan.capacityUtilizationPercentage}%`);

  if (fusedPlan.selectedDemands.length !== 3 || fusedPlan.totalStackedEarnings !== 700 || fusedPlan.residualCapacity.remainingSeats !== 2) {
    throw new Error('Demand Fusion Engine test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('[2/2] Testing Dynamic Pricing Engine & 4 Auction Modes...');

  // Case A: Emergency Medicine (Mode D: Auto Match)
  const priceResEmergency = DynamicPricingEngine.calculatePricing({
    demandId: 'UDO_EMERGENCY_99',
    demandType: 'Medicine',
    weightKg: 2,
    priority: 'Critical',
    distanceKm: 25
  }, 1); // Low capacity count (1) => Surge multiplier

  console.log(` -> Emergency Medicine: Recommended Mode = ${priceResEmergency.recommendedAuctionMode} | Fare: ₹${priceResEmergency.finalRecommendedFare} (Surge: ${priceResEmergency.surgeMultiplier}x)`);

  // Case B: Agricultural Mandi Goods (Mode C: Merchant Bid)
  const priceResMandi = DynamicPricingEngine.calculatePricing({
    demandId: 'UDO_MANDI_88',
    demandType: 'AgriculturalGoods',
    weightKg: 100,
    priority: 'Medium',
    bidAllowed: true,
    distanceKm: 40
  }, 5);

  console.log(` -> Mandi Agricultural Goods: Recommended Mode = ${priceResMandi.recommendedAuctionMode} | Bid Range: ₹${priceResMandi.bidRange.minBid} - ₹${priceResMandi.bidRange.maxBid}`);

  if (priceResEmergency.recommendedAuctionMode !== 'MODE_D_AUTO_MATCH' || priceResMandi.recommendedAuctionMode !== 'MODE_C_MERCHANT_BID') {
    throw new Error('Dynamic Pricing & Auction Modes test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 4 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerificationPhase4().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
