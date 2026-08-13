const http = require('http');
const { VNISHighwayJunctionSnappingEngine } = require('./backend/src/vnisHighwayJunctionSnappingEngine.js');

function fetchOSRMRoute(origin, dest) {
  return new Promise((resolve) => {
    const url = `http://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.routes && parsed.routes[0]) {
            const coords = parsed.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            const distKm = (parsed.routes[0].distance / 1000).toFixed(2);
            resolve({ coords, distKm });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function runCompleteVillageAllocationAudit() {
  console.log('========================================================================================');
  console.log('🌾 COMPLETE REAL VILLAGE ALLOCATION AUDIT: NAUHATTA TO SASARAM CORRIDOR');
  console.log('========================================================================================');

  const origin = { lat: 24.6167, lng: 83.9167, name: 'Nauhatta (Rohtas)' };
  const destination = { lat: 24.9500, lng: 84.0167, name: 'Sasaram (Rohtas)' };

  const routeData = await fetchOSRMRoute(origin, destination);
  if (!routeData || !routeData.coords) {
    console.error('❌ Could not fetch OSRM route');
    return;
  }

  console.log(`✅ Driving Corridor Distance: ${routeData.distKm} KM across ${routeData.coords.length} polyline points.`);

  // Use 5.0 km catchment buffer to capture ALL interior and side-by-side villages
  const result = await VNISHighwayJunctionSnappingEngine.snapRouteToHighwayModes(routeData.coords, 5.0, 40, 100);

  console.log(`\n📍 TOTAL HIGHWAY ACCESS CHOWKS IDENTIFIED: ${result.nodeCount}`);

  let totalVillagesMapped = 0;
  let onHighwayCount = 0;
  let interiorFeederCount = 0;

  console.log('\n========================================================================================');
  console.log('📋 COMPLETE VILLAGE ALLOCATION LIST (HIGHWAY SIDE & T/Y-JUNCTION FEEDER VILLAGES):');
  console.log('========================================================================================');

  result.sequence.forEach((mode, idx) => {
    console.log(`\n[Node #${mode.sequenceIndex}] 📍 ${mode.name} (${mode.displayName}) @ ${mode.cumulativeDistanceKm} KM`);
    if (mode.coLocatedVillages && mode.coLocatedVillages.length > 0) {
      mode.coLocatedVillages.forEach(v => {
        totalVillagesMapped++;
        const name = v.villageName || v.name || 'Village Node';
        const type = v.approachType || mode.feederApproachType;
        if (type === 'ON_HIGHWAY_SIDE_VILLAGE') onHighwayCount++;
        else interiorFeederCount++;

        console.log(`   └─ 🏡 Village: ${name} | Dist: ${v.distanceFromJunctionKm || 0.2}km | Type: [${type}] | Side: ${v.sideOrientation || 'CENTER'}`);
      });
    }
  });

  console.log('\n========================================================================================');
  console.log(`📊 FINAL ALLOCATION METRICS:`);
  console.log(`   • Total Villages Mapped: ${totalVillagesMapped}`);
  console.log(`   • Direct Highway Side Villages: ${onHighwayCount}`);
  console.log(`   • T/Y-Junction Connected Interior Feeder Villages: ${interiorFeederCount}`);
  console.log('========================================================================================');
}

runCompleteVillageAllocationAudit();
