import { SpatialTemporalIndexEngine } from "./spatialTemporalIndex.js";
class RouteSegmentationEngine {
  /**
   * Partitions a multi-stop itinerary into discrete contiguous sub-segments
   */
  static segmentRoute(stops, baseSeats = 0, baseWeightKg = 0, baseVolumeL = 0) {
    if (!stops || stops.length < 2) return [];
    const segments = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];
      if (!from.h3Index) from.h3Index = SpatialTemporalIndexEngine.latLngToH3(from.lat, from.lng);
      if (!to.h3Index) to.h3Index = SpatialTemporalIndexEngine.latLngToH3(to.lat, to.lng);
      const distanceKm = this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
      const estimatedDurationMin = Math.round(distanceKm / 40 * 60);
      segments.push({
        segmentIndex: i,
        fromStop: from,
        toStop: to,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        estimatedDurationMin: Math.max(1, estimatedDurationMin),
        availableSeats: baseSeats,
        availableWeightKg: baseWeightKg,
        availableVolumeL: baseVolumeL
      });
    }
    return segments;
  }
  /**
   * Computes trajectory overlap and detour ratio between a driver's route segments and a demand's pickup-drop points
   */
  static calculateTrajectoryOverlap(driverStops, pickup, drop) {
    if (!driverStops || driverStops.length < 2) {
      return { isMatched: false, overlapPercentage: 0, detourDistanceKm: 999, detourDurationMin: 999, matchedSegments: [] };
    }
    let minPickupDist = Infinity;
    let pickupStopIndex = -1;
    let minDropDist = Infinity;
    let dropStopIndex = -1;
    driverStops.forEach((stop, idx) => {
      const pDist = this.haversineDistance(stop.lat, stop.lng, pickup.lat, pickup.lng);
      if (pDist < minPickupDist) {
        minPickupDist = pDist;
        pickupStopIndex = idx;
      }
      const dDist = this.haversineDistance(stop.lat, stop.lng, drop.lat, drop.lng);
      if (dDist < minDropDist) {
        minDropDist = dDist;
        dropStopIndex = idx;
      }
    });
    const MAX_WALK_PROXIMITY_KM = 5;
    if (minPickupDist > MAX_WALK_PROXIMITY_KM || minDropDist > MAX_WALK_PROXIMITY_KM) {
      return { isMatched: false, overlapPercentage: 0, detourDistanceKm: minPickupDist + minDropDist, detourDurationMin: 999, matchedSegments: [] };
    }
    if (pickupStopIndex > dropStopIndex) {
      return { isMatched: false, overlapPercentage: 0, detourDistanceKm: minPickupDist + minDropDist, detourDurationMin: 999, matchedSegments: [] };
    }
    const matchedSegments = [];
    for (let i = pickupStopIndex; i < Math.max(pickupStopIndex + 1, dropStopIndex); i++) {
      matchedSegments.push(i);
    }
    const totalRouteSegments = driverStops.length - 1;
    const overlapPercentage = Math.round(matchedSegments.length / totalRouteSegments * 100);
    const detourDistanceKm = parseFloat((minPickupDist + minDropDist).toFixed(2));
    const detourDurationMin = Math.round(detourDistanceKm / 30 * 60);
    return {
      isMatched: true,
      overlapPercentage: Math.min(100, Math.max(10, overlapPercentage)),
      detourDistanceKm,
      detourDurationMin,
      matchedSegments
    };
  }
  /**
   * Haversine formula for spherical distance in kilometers
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  static toRad(degrees) {
    return degrees * Math.PI / 180;
  }
}
export {
  RouteSegmentationEngine
};
