/**
 * Village Node Intelligence System (VNIS) - Layer 2: Monotonic Polyline Corridor Snapping & Junction Master Engine
 * 
 * 1. 100m Polyline Sub-Segment Densifier (Sub-samples polyline every 100m to catch EVERY node on road curves).
 * 2. Adaptive Dynamic Buffer Math (Expands up to 1.5km for rural bypass roads).
 * 3. Monotonic Along-Track Distance Projection: Guarantees strict travel direction order (e.g. Khanda -> Behrar -> Dahiyar -> Rampur -> Bagen).
 * 4. 5m Co-Located Junction Master Ranker: Evaluates adjacent nodes (e.g. Behrar vs Semra 5m apart) and ranks nearest primary village.
 * 5. Perpendicular side bearing calculation (👈 LEFT vs 👉 RIGHT).
 */

import { VNISRegistryEngine, IVNISNodeDetails, VNISNodeModel } from './vnisRegistryEngine.js';
import { SpatialTemporalIndexEngine } from './spatialTemporalIndex.js';
import { VNISMonotonicArcLengthEngine } from './vnisMonotonicArcLengthEngine.js';
import fs from 'fs';
import path from 'path';

export interface ICorridorNodeSequenceItem {
  sequenceIndex: number;
  node: IVNISNodeDetails;
  displayName?: string;
  displayHindiName?: string;
  cumulativeDistanceKm: number;
  estimatedEtaMinutes: number;
  highwaySide: 'LEFT' | 'RIGHT' | 'CENTER';
  perpendicularDistanceMeters: number;
  isClusterMaster: boolean;
  coLocatedVillage?: string;
  pointOnPolyline?: { lat: number; lng: number };
}

export interface ICorridorSnappingResult {
  totalCorridorLengthKm: number;
  totalNodesFound: number;
  clusterCount: number;
  averageNodeSpacingKm: number;
  nodesSequence: ICorridorNodeSequenceItem[];
}

let localNodesCache: any[] | null = null;

function loadLocalNodesFallback(): any[] {
  if (localNodesCache) return localNodesCache;
  try {
    const localPath = path.resolve(process.cwd(), 'frontend/public/data/bihar_junction_nodes.json');
    if (fs.existsSync(localPath)) {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (Array.isArray(data)) {
        localNodesCache = data;
        return localNodesCache;
      }
    }
  } catch (e: any) {
    console.warn('[VNISCorridorSnappingEngine] Could not load local junction nodes cache:', e.message);
  }
  return [];
}

export class VNISCorridorSnappingEngine {
  public static decodePolyline(encoded: string): { lat: number; lng: number }[] {
    const points: { lat: number; lng: number }[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
  }

  public static haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  public static densifyPolylinePoints(points: Array<{ lat: number; lng: number }>, stepMeters = 100): Array<{ lat: number; lng: number }> {
    if (!points || points.length < 2) return points || [];
    const dense: Array<{ lat: number; lng: number }> = [points[0]];

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

  public static async snapPolylinePointsToNodes(
    polylinePoints: Array<{ lat: number; lng: number }>,
    bufferKm = 1.2,
    speedKmH = 40,
    minNodeSpacingMeters = 150
  ): Promise<ICorridorSnappingResult> {
    if (!polylinePoints || polylinePoints.length < 2) {
      return { totalCorridorLengthKm: 0, totalNodesFound: 0, clusterCount: 0, averageNodeSpacingKm: 0, nodesSequence: [] };
    }

    const densePoints = this.densifyPolylinePoints(polylinePoints, 100);
    const effectiveBufferKm = Math.max(1.5, bufferKm);

    let totalLengthMeters = 0;
    for (let i = 0; i < densePoints.length - 1; i++) {
      totalLengthMeters += this.haversineDistanceMeters(
        densePoints[i].lat, densePoints[i].lng,
        densePoints[i + 1].lat, densePoints[i + 1].lng
      );
    }

    const h3CellSet = new Set<string>();
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

    const pad = effectiveBufferKm / 111.0;
    minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad;

    let candidateDocs: any[] = [];
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
    } catch (e: any) {
      console.warn('[VNISCorridorSnappingEngine] MongoDB query timed out, invoking local static node fallback:', e.message);
    }

    if (!candidateDocs || candidateDocs.length === 0) {
      const localNodes = loadLocalNodesFallback();
      candidateDocs = localNodes.filter(n => {
        const lat = n.lat || (n.loc && n.loc.coordinates ? n.loc.coordinates[1] : 0);
        const lng = n.lng || (n.loc && n.loc.coordinates ? n.loc.coordinates[0] : 0);
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      }).map(n => ({
        nodeId: n.nodeId || n.id || `LOCAL-${Math.random()}`,
        name: n.name || n.villageName || 'Village Stop',
        localNameHindi: n.localNameHindi || n.hindiName || n.name,
        loc: { type: 'Point', coordinates: [n.lng || (n.loc ? n.loc.coordinates[0] : 0), n.lat || (n.loc ? n.loc.coordinates[1] : 0)] },
        district: n.district || '',
        state: n.state || ''
      }));
    }

    const bufferMeters = effectiveBufferKm * 1000;
    const candidateInputs = candidateDocs.map(d => ({
      nodeId: d.nodeId || d._id?.toString(),
      name: d.name,
      localNameHindi: d.localNameHindi,
      lat: d.loc ? d.loc.coordinates[1] : d.lat,
      lng: d.loc ? d.loc.coordinates[0] : d.lng,
      district: d.district,
      state: d.state
    }));

    const monotonicStops = VNISMonotonicArcLengthEngine.snapAndSortMonotonic(
      densePoints,
      candidateInputs,
      bufferMeters
    );

    const finalSequence: ICorridorNodeSequenceItem[] = [];
    let sequenceIndex = 1;

    for (const stop of monotonicStops) {
      const nodeObj = VNISRegistryEngine.hydrateNode({
        nodeId: stop.nodeId,
        name: stop.name,
        localNameHindi: stop.displayHindiName,
        loc: { type: 'Point', coordinates: [stop.pointOnPolyline.lng, stop.pointOnPolyline.lat] }
      });

      const distKm = stop.arcLengthKm;
      const etaMinutes = Math.round((distKm / speedKmH) * 60);

      finalSequence.push({
        sequenceIndex: sequenceIndex++,
        node: nodeObj,
        displayName: stop.displayName,
        displayHindiName: stop.displayHindiName,
        cumulativeDistanceKm: distKm,
        estimatedEtaMinutes: etaMinutes,
        perpendicularDistanceMeters: stop.perpendicularDistMeters,
        highwaySide: stop.sideOrientation,
        isClusterMaster: true,
        coLocatedVillage: stop.coLocatedVillages.length > 1 ? stop.coLocatedVillages.join(' & ') : undefined,
        pointOnPolyline: stop.pointOnPolyline
      });
    }

    const totalNodesFound = finalSequence.length;
    const avgSpacingKm = totalNodesFound > 1 ? Number((finalSequence[totalNodesFound - 1].cumulativeDistanceKm / (totalNodesFound - 1)).toFixed(2)) : 0;

    return {
      totalCorridorLengthKm: Number((totalLengthMeters / 1000).toFixed(2)),
      totalNodesFound,
      clusterCount: finalSequence.length,
      averageNodeSpacingKm: avgSpacingKm,
      nodesSequence: finalSequence
    };
  }
}
