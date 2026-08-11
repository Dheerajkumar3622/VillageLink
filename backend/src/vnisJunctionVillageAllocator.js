import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Haversine distance in meters
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Perpendicular distance from point P to line segment AB in meters
function distanceToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dAB = haversineDistanceMeters(aLat, aLng, bLat, bLng);
  if (dAB === 0) return haversineDistanceMeters(pLat, pLng, aLat, aLng);

  // Vector math projection factor t
  const t = ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) /
            ((bLat - aLat) ** 2 + (bLng - aLng) ** 2);

  const tClamped = Math.max(0, Math.min(1, t));
  const projLat = aLat + tClamped * (bLat - aLat);
  const projLng = aLng + tClamped * (bLng - aLng);

  return {
    distanceMeters: haversineDistanceMeters(pLat, pLng, projLat, projLng),
    snappedLat: projLat,
    snappedLng: projLng,
    tRatio: tClamped
  };
}

export class VNISJunctionVillageAllocator {
  /**
   * Allocate interior T-Junction & Y-Junction villages to main highway polyline
   * 
   * @param {Array<{lat: number, lng: number}>} polyline 
   * @param {number} maxFeederRadiusKm Max radius off highway (default 3.0 km)
   */
  static async allocateJunctionVillages(polyline, maxFeederRadiusKm = 3.0) {
    if (!polyline || polyline.length < 2) {
      return { junctions: [], unallocatedVillages: [], totalJunctionsMapped: 0 };
    }

    // Load master village database (bihar_junction_nodes.json)
    let villageDb = [];
    try {
      const dbPath = path.join(__dirname, '..', 'data', 'bihar_junction_nodes.json');
      if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, 'utf8');
        const raw = JSON.parse(content);
        villageDb = Array.isArray(raw) ? raw : (raw.nodes || []);
      }
    } catch (err) {
      console.error('[VNISJunctionVillageAllocator] Failed to load village DB:', err);
    }

    // Step 1: Detect T-Junctions and Y-Junctions along the polyline
    // A highway polyline node is a T/Y junction if heading diverges >= 25 degrees or at 1.5km intervals
    const junctionNodes = [];
    let cumulativeDistMeters = 0;

    for (let i = 0; i < polyline.length; i++) {
      const curr = polyline[i];
      let isJunction = false;
      let junctionType = 'STANDARD_STOP';
      let junctionName = curr.name || `Highway Node #${i + 1}`;

      if (i === 0) {
        isJunction = true;
        junctionType = 'ORIGIN_TERMINAL';
      } else if (i === polyline.length - 1) {
        isJunction = true;
        junctionType = 'DESTINATION_TERMINAL';
      } else {
        const prev = polyline[i - 1];
        const next = polyline[i + 1];
        const distStep = haversineDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
        cumulativeDistMeters += distStep;

        // Heading divergence check
        const headingIn = Math.atan2(curr.lng - prev.lng, curr.lat - prev.lat) * (180 / Math.PI);
        const headingOut = Math.atan2(next.lng - curr.lng, next.lat - curr.lat) * (180 / Math.PI);
        let turnAngle = Math.abs(headingOut - headingIn);
        if (turnAngle > 180) turnAngle = 360 - turnAngle;

        if (turnAngle >= 25) {
          isJunction = true;
          junctionType = turnAngle >= 60 ? 'T_JUNCTION' : 'Y_JUNCTION';
        } else if (distStep >= 1500 || (curr.name && curr.name !== prev.name)) {
          isJunction = true;
          junctionType = 'FEEDER_APPROACH_CHOWK';
        }
      }

      if (isJunction) {
        junctionNodes.push({
          id: `jnc_${i}_${Math.round(curr.lat * 1000)}_${Math.round(curr.lng * 1000)}`,
          highwayNodeIndex: i,
          lat: curr.lat,
          lng: curr.lng,
          junctionName: junctionName,
          junctionType: junctionType,
          cumulativeDistKm: parseFloat((cumulativeDistMeters / 1000).toFixed(2)),
          connectedVillages: []
        });
      }
    }

    // Step 2: Match every village in the region to its nearest Highway T/Y Junction
    const allocatedVillagesMap = new Map();

    for (const v of villageDb) {
      if (!v.lat || !v.lng) continue;

      let minDistMeters = Infinity;
      let bestJunction = null;

      for (const jnc of junctionNodes) {
        const dist = haversineDistanceMeters(v.lat, v.lng, jnc.lat, jnc.lng);
        if (dist < minDistMeters) {
          minDistMeters = dist;
          bestJunction = jnc;
        }
      }

      const distKm = minDistMeters / 1000;
      if (distKm <= maxFeederRadiusKm && bestJunction) {
        const villageInfo = {
          villageId: v.id || `vil_${Math.round(v.lat * 1000)}`,
          villageName: v.name || v.nodeName || 'Interior Village',
          district: v.district || 'Rohtas/Buxar',
          feederDistanceKm: parseFloat(distKm.toFixed(2)),
          feederDistanceMeters: Math.round(minDistMeters),
          approachType: distKm <= 0.3 ? 'ON_HIGHWAY' : distKm <= 1.2 ? 'T_JUNCTION_WALK' : 'Y_JUNCTION_FEEDER_AUTO',
          boardingChowkName: `${bestJunction.junctionName} (${v.name || 'Village'} Feeder Mode)`
        };

        bestJunction.connectedVillages.push(villageInfo);
        allocatedVillagesMap.set(villageInfo.villageId, true);
      }
    }

    // Sort connected villages by feeder distance
    for (const jnc of junctionNodes) {
      jnc.connectedVillages.sort((a, b) => a.feederDistanceMeters - b.feederDistanceMeters);
      if (jnc.connectedVillages.length > 0 && (!jnc.junctionName || jnc.junctionName.startsWith('Highway Node'))) {
        jnc.junctionName = `${jnc.connectedVillages[0].villageName} ${jnc.junctionType === 'T_JUNCTION' ? 'T-Junction' : 'Mode Chowk'}`;
      }
    }

    return {
      success: true,
      totalHighwayJunctions: junctionNodes.length,
      maxFeederRadiusKm,
      junctions: junctionNodes,
      totalVillagesMapped: Array.from(allocatedVillagesMap.keys()).length
    };
  }
}
