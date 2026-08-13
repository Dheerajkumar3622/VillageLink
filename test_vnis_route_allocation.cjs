const { VNISJunctionVillageAllocator } = require('./backend/src/vnisJunctionVillageAllocator.js');

async function testAllocation() {
  console.log('--- Testing VNIS T/Y-Junction Village Polyline Allocation ---');
  
  // Sample Google Maps polyline coordinates (Nauhatta -> Dahiyar -> Bagen -> Sasaram)
  const samplePolyline = [
    { lat: 24.87, lng: 84.18, name: 'Nauhatta Bus Stop' },
    { lat: 24.95, lng: 84.12, name: 'Dahiyar Highway Node' },
    { lat: 25.08, lng: 84.02, name: 'Bagen Feeder Chowk' },
    { lat: 24.95, lng: 84.03, name: 'Sasaram Terminal' }
  ];

  try {
    const result = await VNISJunctionVillageAllocator.allocateJunctionVillages(samplePolyline, 3.0);
    console.log('✅ Allocation Result Success:', result.success);
    console.log('📍 Total Highway Junctions:', result.totalHighwayJunctions);
    console.log('🏘️ Total Villages Mapped:', result.totalVillagesMapped);
    console.log('📋 Junction Summary:');
    result.junctions.forEach((jnc, idx) => {
      console.log(`   [${idx + 1}] ${jnc.junctionName} (${jnc.junctionType}) @ ${jnc.cumulativeDistKm} km`);
      (jnc.connectedVillages || []).forEach(v => {
        console.log(`        -> Feeder: ${v.villageName} (${v.feederDistanceKm} km walk/auto)`);
      });
    });
  } catch (err) {
    console.error('❌ Allocation Error:', err);
  }
}

testAllocation();
