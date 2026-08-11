import { RouteSegmentationEngine } from "./routeSegmentationEngine.js";
class AntiFraudShieldEngine {
  /**
   * Verifies GPS telemetry updates to detect Impossible Speed / Location Jumps (>150 km/h)
   */
  static verifyTelemetry(driverId, lastLocation, newLocation) {
    const timeDeltaHours = (newLocation.timestamp - lastLocation.timestamp) / (1e3 * 3600);
    if (timeDeltaHours <= 2e-4) {
      return { driverId, isAuthentic: true, fraudFlag: false, computedSpeedKmH: 0, riskPenalty: 0 };
    }
    const distanceKm = RouteSegmentationEngine.haversineDistance(
      lastLocation.lat,
      lastLocation.lng,
      newLocation.lat,
      newLocation.lng
    );
    const computedSpeedKmH = Math.round(distanceKm / timeDeltaHours);
    const MAX_PHYSICAL_SPEED_KMH = 150;
    if (computedSpeedKmH > MAX_PHYSICAL_SPEED_KMH) {
      return {
        driverId,
        isAuthentic: false,
        fraudFlag: true,
        computedSpeedKmH,
        anomalyReason: `Impossible Location Jump detected: ${computedSpeedKmH} km/h exceeds physical threshold of ${MAX_PHYSICAL_SPEED_KMH} km/h`,
        riskPenalty: 40
      };
    }
    return {
      driverId,
      isAuthentic: true,
      fraudFlag: false,
      computedSpeedKmH,
      riskPenalty: 0
    };
  }
  /**
   * Detects incentive gaming patterns (e.g. repeated fake availability or suspicious cancellations)
   */
  static detectIncentiveGaming(driverId, cancellationCount24h) {
    if (cancellationCount24h >= 4) {
      return { gamingDetected: true, action: "SUSPEND_INCENTIVES_AND_FLAG_AUDIT" };
    }
    return { gamingDetected: false, action: "ALLOW" };
  }
}
export {
  AntiFraudShieldEngine
};
