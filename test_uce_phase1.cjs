const { validateUCO, validateUDO } = require('./shared/src/ucoSchemas');
const { SpatialTemporalIndexEngine } = require('./backend/src/spatialTemporalIndex');

async function runVerification() {
  console.log('====================================================');
  console.log('     UCE PHASE 1 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  // Test 1: H3 Spatial Hex Indexing
  console.log('[1/4] Testing H3 Spatial Indexing & k-Ring Generation...');
  const patnaLat = 25.5941;
  const patnaLng = 85.1376;
  const h3Index = SpatialTemporalIndexEngine.latLngToH3(patnaLat, patnaLng, 7);
  const ring = SpatialTemporalIndexEngine.getH3kRing(h3Index);
  
  console.log(` -> Lat/Lng (${patnaLat}, ${patnaLng}) => H3 Index: ${h3Index}`);
  console.log(` -> 1-Ring Spatial Radius (${ring.length} cells):`, ring.slice(0, 3), '...');
  if (!h3Index.startsWith('h3_r7_') || ring.length !== 7) {
    throw new Error('H3 Indexing test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 2: Temporal Interval Window Overlap
  console.log('[2/4] Testing Temporal Interval Overlap Matching...');
  const now = Date.now();
  const capWindow = { start: now, end: now + (2 * 3600 * 1000) };
  const demandWindow = { start: now + (1 * 3600 * 1000), end: now + (3 * 3600 * 1000) };
  const nonOverlapWindow = { start: now + (4 * 3600 * 1000), end: now + (5 * 3600 * 1000) };

  const matchRes1 = SpatialTemporalIndexEngine.checkTimeWindowOverlap(capWindow, demandWindow);
  const matchRes2 = SpatialTemporalIndexEngine.checkTimeWindowOverlap(capWindow, nonOverlapWindow);

  console.log(` -> Window Overlap Check 1: ${matchRes1.overlap} (Duration: ${matchRes1.overlapMs / 60000} mins)`);
  console.log(` -> Window Overlap Check 2: ${matchRes2.overlap}`);

  if (!matchRes1.overlap || matchRes2.overlap) {
    throw new Error('Temporal Interval Overlap test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 3: UCO Schema Runtime Validation
  console.log('[3/4] Testing UCO (Universal Capacity Object) Validation Schema...');
  const validUCOData = {
    capacityId: 'UCO_TEST_001',
    ownerId: 'DRIVER_99',
    vehicleId: 'VEH_PATNA_88',
    currentLocation: { lat: 25.5941, lng: 85.1376, h3Index },
    destination: { lat: 25.4665, lng: 84.6654 },
    availableSeats: 2,
    availableWeightKg: 40,
    availableVolumeL: 150,
    departureTime: now,
    arrivalTimeWindow: { start: now, end: now + 7200000 },
    allowedCargoTypes: ['Parcel', 'Passenger', 'Medicine'],
    trustScore: 98,
    insuranceLevel: 1,
    status: 'Available',
    liveGps: { lat: 25.5941, lng: 85.1376, speed: 45, timestamp: now },
    expiryTime: now + 14400000
  };

  const valRes = validateUCO(validUCOData);
  console.log(` -> UCO Schema Valid: ${valRes.valid}`);
  if (!valRes.valid) {
    console.error('Validation errors:', valRes.errors);
    throw new Error('UCO validation schema test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 4: UDO Schema Runtime Validation
  console.log('[4/4] Testing UDO (Universal Demand Object) Validation Schema...');
  const validUDOData = {
    demandId: 'UDO_TEST_001',
    requesterId: 'SHOP_ARA_12',
    demandType: 'Medicine',
    pickupLocation: { lat: 25.5941, lng: 85.1376, address: 'Patna Medical Hub' },
    dropLocation: { lat: 25.4665, lng: 84.6654, address: 'Ara Clinic' },
    weightKg: 5,
    volumeL: 20,
    passengerCount: 0,
    priority: 'High',
    deadlineWindow: { pickupBefore: now + 3600000, dropBefore: now + 7200000 },
    temperatureRequirement: '2-8C',
    fragile: true,
    insuranceNeeded: true,
    bidAllowed: true,
    maxBudget: 350,
    status: 'Created',
    createdAt: now
  };

  const udoValRes = validateUDO(validUDOData);
  console.log(` -> UDO Schema Valid: ${udoValRes.valid}`);
  if (!udoValRes.valid) {
    console.error('Validation errors:', udoValRes.errors);
    throw new Error('UDO validation schema test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 1 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
