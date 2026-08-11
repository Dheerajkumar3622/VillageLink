/**
 * VNIS Universal Highway Access Junction ("Gaaw ka Mode") Snapping Engine
 * 
 * Key Functions:
 * 1. Densifies driving polyline every 50m to capture sharp road curves, T-junctions, and Y-junctions.
 * 2. Projects off-road village centroids (up to 3.0km off main road) onto nearest highway turn/feeder junction.
 * 3. Multi-Village Co-location Disambiguation: Merges villages sharing the same highway junction into a single Master Pickup Hub ("Village A - Village B Mode").
 * 4. Monotonic 1D Arc-Length Parameterization: Guarantees 100% strictly increasing sequential order along travel direction for both A -> Z and Z -> A routes.
 */

import { SpatialTemporalIndexEngine } from './spatialTemporalIndex.js';
import { VNISNodeModel } from './vnisRegistryEngine.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';


let localNodesCache = null;
let spatialGridIndex = new Map();

function getGridKey(lat, lng) {
  return `${Math.floor(lat)}_${Math.floor(lng)}`;
}

function loadLocalNodesFallback() {
  if (localNodesCache) return localNodesCache;
  try {
    const biharPath = path.resolve(process.cwd(), 'frontend/public/data/bihar_junction_nodes.json');
    const masterPath = path.resolve(process.cwd(), 'frontend/public/data/precision_village_nodes.json');
    let combined = [];

    if (fs.existsSync(biharPath)) {
      const d1 = JSON.parse(fs.readFileSync(biharPath, 'utf8'));
      if (Array.isArray(d1)) combined = combined.concat(d1);
    }
    if (fs.existsSync(masterPath)) {
      const d2 = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
      if (Array.isArray(d2)) combined = combined.concat(d2);
    }

    if (combined.length > 0) {
      localNodesCache = combined;
      // Index into spatial grid buckets for sub-millisecond BBox queries
      spatialGridIndex.clear();
      for (let i = 0; i < combined.length; i++) {
        const n = combined[i];
        const lat = n.lat || (n.loc && n.loc.coordinates ? n.loc.coordinates[1] : null);
        const lng = n.lng || (n.loc && n.loc.coordinates ? n.loc.coordinates[0] : null);
        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
          const key = getGridKey(lat, lng);
          if (!spatialGridIndex.has(key)) spatialGridIndex.set(key, []);
          spatialGridIndex.get(key).push(n);
        }
      }
      console.log(`[VNISHighwayJunctionSnappingEngine] Indexed ${combined.length} nodes into ${spatialGridIndex.size} spatial grid buckets.`);
      return localNodesCache;
    }
  } catch (e) {
    console.warn('[VNISHighwayJunctionSnappingEngine] Could not load local junction nodes cache:', e.message);
  }
  return [];
}

function querySpatialGridBBox(minLat, maxLat, minLng, maxLng) {
  loadLocalNodesFallback();
  const results = [];
  const minLatFloor = Math.floor(minLat);
  const maxLatFloor = Math.floor(maxLat);
  const minLngFloor = Math.floor(minLng);
  const maxLngFloor = Math.floor(maxLng);

  for (let latDeg = minLatFloor; latDeg <= maxLatFloor; latDeg++) {
    for (let lngDeg = minLngFloor; lngDeg <= maxLngFloor; lngDeg++) {
      const key = `${latDeg}_${lngDeg}`;
      const bucket = spatialGridIndex.get(key);
      if (bucket) {
        for (let i = 0; i < bucket.length; i++) {
          const n = bucket[i];
          const lat = n.lat || (n.loc ? n.loc.coordinates[1] : 0);
          const lng = n.lng || (n.loc ? n.loc.coordinates[0] : 0);
          if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
            results.push(n);
          }
        }
      }
    }
  }
  return results;
}


export class VNISHighwayJunctionSnappingEngine {
  static haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Densifies polyline every 50m to capture fine-grained road geometry
   */
  static densifyPolyline(points, stepMeters = 50) {
    if (!points || points.length < 2) return points || [];
    const dense = [points[0]];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = this.haversineDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng);

      if (dist > stepMeters) {
        const steps = Math.floor(dist / stepMeters);
        for (let s = 1; s <= steps; s++) {
          const ratio = s / (steps + 1);
          dense.push({
            lat: Number((p1.lat + ratio * (p2.lat - p1.lat)).toFixed(6)),
            lng: Number((p1.lng + ratio * (p2.lng - p1.lng)).toFixed(6))
          });
        }
      }
      dense.push(p2);
    }
    return dense;
  }

  /**
   * Snap route polyline points to sequential village highway access modes ("Gaaw ke Mode")
   */
  static async snapRouteToHighwayModes(
    polylinePoints,
    bufferKm = 5.0,
    speedKmH = 40,
    coLocationWindowMeters = 50
  ) {
    if (!polylinePoints || polylinePoints.length < 2) {
      return { totalDistanceKm: 0, nodeCount: 0, sequence: [] };
    }

    const densePoints = this.densifyPolyline(polylinePoints, 50);
    const effectiveBufferMeters = bufferKm * 1000;

    // 1. Calculate cumulative 1D arc-lengths along polyline
    const cumulativeDistances = [0];
    let totalLengthMeters = 0;
    for (let i = 0; i < densePoints.length - 1; i++) {
      const segDist = this.haversineDistanceMeters(
        densePoints[i].lat, densePoints[i].lng,
        densePoints[i + 1].lat, densePoints[i + 1].lng
      );
      totalLengthMeters += segDist;
      cumulativeDistances.push(totalLengthMeters);
    }

    // 2. Compute spatial BBox and H3 Cell Ring set for candidate node lookup
    const h3CellSet = new Set();
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

    for (const pt of densePoints) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;

      const cell = SpatialTemporalIndexEngine.latLngToH3(pt.lat, pt.lng, 7);
      const ring = SpatialTemporalIndexEngine.getH3kRing(cell);
      ring.forEach(c => h3CellSet.add(c));
    }

    const pad = bufferKm / 111.0;
    minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad;

    let candidateDocs = [];
    if (mongoose.connection.readyState === 1) {
      try {
        candidateDocs = await VNISNodeModel.find({
          $or: [
            { h3_r7: { $in: Array.from(h3CellSet) } },
            {
              loc: {
                $geoWithin: {
                  $box: [
                    [minLng, minLat],
                    [maxLng, maxLat]
                  ]
                }
              }
            }
          ]
        }).lean();
      } catch (e) {
        console.warn('[VNISHighwayJunctionSnappingEngine] MongoDB query fallback to static nodes:', e.message);
      }
    }


    // Fallback if MongoDB candidate search returns 0 or fails
    if (!candidateDocs || candidateDocs.length === 0) {
      const localNodes = querySpatialGridBBox(minLat, maxLat, minLng, maxLng);
      candidateDocs = localNodes.map(n => ({
        nodeId: n.nodeId || n.id || `NODE_${n.name || 'UNKNOWN'}_${Math.random().toString(36).substr(2, 5)}`,
        name: n.name || n.associatedVillage || 'Village Mode',
        localNameHindi: n.localNameHindi || n.name,
        loc: { type: 'Point', coordinates: [n.lng || (n.loc ? n.loc.coordinates[0] : 0), n.lat || (n.loc ? n.loc.coordinates[1] : 0)] },
        district: n.district || '',
        state: n.state || ''
      }));
    }


    // 3. Perpendicular projection of candidate nodes onto driving polyline
    const projectedStops = [];

    for (const doc of candidateDocs) {
      const nodeLat = doc.loc ? doc.loc.coordinates[1] : doc.lat;
      const nodeLng = doc.loc ? doc.loc.coordinates[0] : doc.lng;
      const nodeName = doc.name || 'Village Mode';
      const localHindi = doc.localNameHindi || nodeName;

      let minPerpDist = Infinity;
      let bestArcLength = -1;
      let bestPoint = { lat: nodeLat, lng: nodeLng };
      let bestSide = 'CENTER';

      for (let i = 0; i < densePoints.length - 1; i++) {
        const p1 = densePoints[i];
        const p2 = densePoints[i + 1];

        const dX = p2.lng - p1.lng;
        const dY = p2.lat - p1.lat;
        const lenSq = dX * dX + dY * dY;

        let t = 0;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, ((nodeLng - p1.lng) * dX + (nodeLat - p1.lat) * dY) / lenSq));
        }

        const projLat = p1.lat + t * dY;
        const projLng = p1.lng + t * dX;
        const perpDist = this.haversineDistanceMeters(nodeLat, nodeLng, projLat, projLng);

        if (perpDist <= effectiveBufferMeters && perpDist < minPerpDist) {
          minPerpDist = perpDist;
          const segLen = cumulativeDistances[i + 1] - cumulativeDistances[i];
          bestArcLength = cumulativeDistances[i] + t * segLen;
          bestPoint = { lat: Number(projLat.toFixed(6)), lng: Number(projLng.toFixed(6)) };

          const crossProduct = (p2.lng - p1.lng) * (nodeLat - p1.lat) - (p2.lat - p1.lat) * (nodeLng - p1.lng);
          if (crossProduct > 0.000001) bestSide = 'LEFT';
          else if (crossProduct < -0.000001) bestSide = 'RIGHT';
          else bestSide = 'CENTER';
        }
      }

      if (bestArcLength >= 0) {
        projectedStops.push({
          nodeId: doc.nodeId || `NODE_${nodeName}`,
          name: nodeName,
          localNameHindi: localHindi,
          district: doc.district || '',
          state: doc.state || '',
          arcLengthMeters: bestArcLength,
          perpDistMeters: Math.round(minPerpDist),
          side: bestSide,
          pointOnPolyline: bestPoint
        });
      }
    }

    // 4. Sort strictly by monotonic 1D arc-length along polyline
    projectedStops.sort((a, b) => a.arcLengthMeters - b.arcLengthMeters);

    // 5. Multi-Village Co-Location Disambiguation
    const sequence = [];

    for (let i = 0; i < projectedStops.length; i++) {
      const curr = projectedStops[i];

      if (sequence.length > 0) {
        const lastHub = sequence[sequence.length - 1];
        const distToLast = Math.abs(curr.arcLengthMeters - lastHub.cumulativeDistanceKm * 1000);

        if (distToLast <= coLocationWindowMeters) {
          // Merge co-located village into single shared junction mode
          if (!lastHub.coLocatedVillages.includes(curr.name)) {
            lastHub.coLocatedVillages.push(curr.name);
            const cleanName = curr.name.replace(/\s*Mode|\s*मोड़/gi, '').trim();
            const cleanHindi = (curr.localNameHindi || curr.name).replace(/\s*Mode|\s*मोड़/gi, '').trim();

            if (!lastHub.name.includes(cleanName)) {
              lastHub.name = `${lastHub.name} - ${cleanName} Mode`;
              lastHub.displayName = `${lastHub.displayName} & ${cleanName}`;
              lastHub.displayHindiName = `${lastHub.displayHindiName} & ${cleanHindi} मोड़`;
            }
          }
          continue;
        }
      }

      const sidePrefix = curr.side === 'LEFT' ? '👈 ' : curr.side === 'RIGHT' ? '👉 ' : '';
      const formattedModeName = curr.name.toLowerCase().includes('mode') || curr.name.includes('मोड़') 
        ? curr.name 
        : `${curr.name} Mode`;
      const formattedHindiName = curr.localNameHindi.includes('मोड़') 
        ? curr.localNameHindi 
        : `${curr.localNameHindi} मोड़`;

      const distKm = Number((curr.arcLengthMeters / 1000).toFixed(2));
      const etaMinutes = Math.round((distKm / speedKmH) * 60);

      sequence.push({
        sequenceIndex: sequence.length + 1,
        nodeId: curr.nodeId,
        name: formattedModeName,
        localNameHindi: formattedHindiName,
        displayName: `${sidePrefix}${formattedModeName}`,
        displayHindiName: `${sidePrefix}${formattedHindiName}`,
        cumulativeDistanceKm: distKm,
        estimatedEtaMinutes: etaMinutes,
        perpendicularDistanceMeters: curr.perpDistMeters,
        sideOrientation: curr.side,
        coLocatedVillages: [curr.name],
        pointOnPolyline: curr.pointOnPolyline,
        district: curr.district,
        state: curr.state
      });
    }

    return {
      totalDistanceKm: Number((totalLengthMeters / 1000).toFixed(2)),
      nodeCount: sequence.length,
      sequence
    };
  }
}
