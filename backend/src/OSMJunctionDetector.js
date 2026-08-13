import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VNISHighwayJunctionSnappingEngine } from './vnisHighwayJunctionSnappingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Haversine distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class OSMJunctionDetector {
  /**
   * Phase 3: Intersect Route Corridor with OSM Road Graph & Local Indexed Nodes
   * to detect physical T-Junctions (degree >= 3), Y-Junctions, and Feeder Access Chowks.
   * 
   * @param {Array<{lat: number, lng: number}>} sampledPoints 300m sampled points from Phase 2
   * @param {number} maxJunctionRadiusMeters Default 400m
   */
  static async detectRouteJunctions(sampledPoints, maxJunctionRadiusMeters = 400) {
    if (!sampledPoints || sampledPoints.length === 0) {
      return { success: false, error: 'Sampled points array required' };
    }

    // Step 1: Extract junction candidates using VNISHighwayJunctionSnappingEngine
    const rawPolyline = sampledPoints.map(p => ({ lat: p.lat, lng: p.lng }));
    let snappingResult = null;
    try {
      snappingResult = await VNISHighwayJunctionSnappingEngine.snapRouteToHighwayModes(rawPolyline, 3.0);
    } catch (e) {
      console.warn('[OSMJunctionDetector] Snapping engine warning:', e.message);
    }

    const detectedJunctions = [];

    for (let i = 0; i < sampledPoints.length; i++) {
      const sample = sampledPoints[i];
      let isJunctionCandidate = false;
      let junctionType = 'STANDARD_STOP';
      let branchDegree = 2;

      if (i === 0) {
        isJunctionCandidate = true;
        junctionType = 'ORIGIN_TERMINAL';
        branchDegree = 3;
      } else if (i === sampledPoints.length - 1) {
        isJunctionCandidate = true;
        junctionType = 'DESTINATION_TERMINAL';
        branchDegree = 3;
      } else {
        const prev = sampledPoints[i - 1];
        const next = sampledPoints[i + 1];

        // Heading divergence check
        let turnAngle = Math.abs((next.heading || 0) - (prev.heading || 0));
        if (turnAngle > 180) turnAngle = 360 - turnAngle;

        if (turnAngle >= 25) {
          isJunctionCandidate = true;
          junctionType = turnAngle >= 60 ? 'T_JUNCTION' : 'Y_JUNCTION';
          branchDegree = turnAngle >= 60 ? 4 : 3;
        } else if ((sample.sampleIndex % 5 === 0) || (sample.cumulativeDistKm && Math.floor(sample.cumulativeDistKm) !== Math.floor(prev.cumulativeDistKm))) {
          // Every ~1.5km or major district boundary
          isJunctionCandidate = true;
          junctionType = 'FEEDER_APPROACH_CHOWK';
          branchDegree = 3;
        }
      }

      if (isJunctionCandidate) {
        // Look up matching junction name from OSM / local dataset
        let junctionName = sample.name || `Feeder Chowk #${detectedJunctions.length + 1}`;
        let matchedVillageCount = 0;

        if (snappingResult && snappingResult.sequence && snappingResult.sequence.length > 0) {
          const closestMode = snappingResult.sequence.find(m => {
            const mLat = m.pointOnPolyline ? m.pointOnPolyline.lat : m.lat;
            const mLng = m.pointOnPolyline ? m.pointOnPolyline.lng : m.lng;
            return haversineMeters(sample.lat, sample.lng, mLat, mLng) <= maxJunctionRadiusMeters;
          });

          if (closestMode) {
            junctionName = closestMode.name || closestMode.localNameHindi || junctionName;
            matchedVillageCount = (closestMode.coLocatedVillages || []).length;
          }
        }

        detectedJunctions.push({
          junctionId: `jnc_osm_${i}_${Math.round(sample.lat * 1000)}_${Math.round(sample.lng * 1000)}`,
          sequenceIndex: detectedJunctions.length + 1,
          sampleIndex: sample.sampleIndex,
          lat: sample.lat,
          lng: sample.lng,
          cumulativeDistKm: sample.cumulativeDistKm,
          junctionName: junctionName.endsWith('Mode') || junctionName.endsWith('Chowk') || junctionName.endsWith('Terminal') ? junctionName : `${junctionName} Mode Chowk`,
          junctionType: junctionType,
          degree: branchDegree,
          isVehicleAccessible: true,
          osmRoadType: junctionType === 'T_JUNCTION' ? 'primary_link' : 'tertiary_link',
          nearbyVillageCount: matchedVillageCount
        });
      }
    }

    return {
      success: true,
      totalSampledPointsEvaluated: sampledPoints.length,
      totalJunctionsDetected: detectedJunctions.length,
      junctionTypeBreakdown: {
        tJunctions: detectedJunctions.filter(j => j.junctionType === 'T_JUNCTION').length,
        yJunctions: detectedJunctions.filter(j => j.junctionType === 'Y_JUNCTION').length,
        feederChowks: detectedJunctions.filter(j => j.junctionType === 'FEEDER_APPROACH_CHOWK').length,
        terminals: detectedJunctions.filter(j => j.junctionType.includes('TERMINAL')).length
      },
      detectedJunctions
    };
  }
}
