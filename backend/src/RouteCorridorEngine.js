import fs from 'fs';
import path from 'path';

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

// Interpolate point between P1 and P2 at ratio t (0 <= t <= 1)
function interpolatePoint(p1, p2, t) {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lng: p1.lng + (p2.lng - p1.lng) * t
  };
}

export class RouteCorridorEngine {
  /**
   * Phase 2: Segment Google Maps Route Polyline into 300m Equidistant Sampling Points
   * and compute spatial bounding corridor.
   * 
   * @param {Array<{lat: number, lng: number}>} polyline 
   * @param {number} sampleIntervalMeters Default 300m
   * @param {number} bufferRadiusKm Default 3.0 km
   */
  static segmentCorridor(polyline, sampleIntervalMeters = 300, bufferRadiusKm = 3.0) {
    if (!polyline || polyline.length < 2) {
      return { success: false, error: 'Polyline must have at least 2 points' };
    }

    const sampledPoints = [];
    let cumulativeDistanceMeters = 0;
    let distanceSinceLastSample = 0;

    // Always include origin point
    sampledPoints.push({
      sampleIndex: 0,
      lat: polyline[0].lat,
      lng: polyline[0].lng,
      cumulativeDistKm: 0.0,
      heading: 0
    });

    let minLat = polyline[0].lat;
    let maxLat = polyline[0].lat;
    let minLng = polyline[0].lng;
    let maxLng = polyline[0].lng;

    for (let i = 0; i < polyline.length - 1; i++) {
      const p1 = polyline[i];
      const p2 = polyline[i + 1];

      // Track bounding box
      minLat = Math.min(minLat, p2.lat);
      maxLat = Math.max(maxLat, p2.lat);
      minLng = Math.min(minLng, p2.lng);
      maxLng = Math.max(maxLng, p2.lng);

      const segmentLength = haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
      if (segmentLength === 0) continue;

      // Heading calculation
      const headingDeg = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * (180 / Math.PI);

      let step = 0;
      while (distanceSinceLastSample + (segmentLength - step) >= sampleIntervalMeters) {
        const remainingForNextSample = sampleIntervalMeters - distanceSinceLastSample;
        step += remainingForNextSample;
        const t = step / segmentLength;
        const interp = interpolatePoint(p1, p2, t);

        cumulativeDistanceMeters += sampleIntervalMeters;
        distanceSinceLastSample = 0;

        sampledPoints.push({
          sampleIndex: sampledPoints.length,
          lat: parseFloat(interp.lat.toFixed(6)),
          lng: parseFloat(interp.lng.toFixed(6)),
          cumulativeDistKm: parseFloat((cumulativeDistanceMeters / 1000).toFixed(2)),
          heading: Math.round(headingDeg)
        });
      }

      distanceSinceLastSample += (segmentLength - step);
      cumulativeDistanceMeters += (segmentLength - step);
    }

    // Always include destination point
    const lastP = polyline[polyline.length - 1];
    if (sampledPoints.length === 1 || sampledPoints[sampledPoints.length - 1].lat !== lastP.lat) {
      sampledPoints.push({
        sampleIndex: sampledPoints.length,
        lat: lastP.lat,
        lng: lastP.lng,
        cumulativeDistKm: parseFloat((cumulativeDistanceMeters / 1000).toFixed(2)),
        heading: sampledPoints[sampledPoints.length - 1].heading
      });
    }

    // Expand bounding box with bufferRadiusKm
    const latBuffer = bufferRadiusKm / 111.0; // 1 deg lat ~ 111 km
    const lngBuffer = bufferRadiusKm / (111.0 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));

    const corridorBoundingBox = {
      sw: { lat: parseFloat((minLat - latBuffer).toFixed(6)), lng: parseFloat((minLng - lngBuffer).toFixed(6)) },
      ne: { lat: parseFloat((maxLat + latBuffer).toFixed(6)), lng: parseFloat((maxLng + lngBuffer).toFixed(6)) }
    };

    return {
      success: true,
      totalRouteDistanceKm: parseFloat((cumulativeDistanceMeters / 1000).toFixed(2)),
      totalSampledPoints: sampledPoints.length,
      sampleIntervalMeters,
      bufferRadiusKm,
      corridorBoundingBox,
      sampledPoints
    };
  }
}
