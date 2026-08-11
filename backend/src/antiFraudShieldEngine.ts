import { RouteSegmentationEngine } from './routeSegmentationEngine.js';

export interface TelemetryVerificationResult {
  driverId: string;
  isAuthentic: boolean;
  fraudFlag: boolean;
  computedSpeedKmH: number;
  anomalyReason?: string;
  riskPenalty: number;
}

export class AntiFraudShieldEngine {
  /**
   * Verifies GPS telemetry updates to detect Impossible Speed / Location Jumps (>150 km/h)
   */
  public static verifyTelemetry(
    driverId: string,
    lastLocation: { lat: number; lng: number; timestamp: number },
    newLocation: { lat: number; lng: number; timestamp: number }
  ): TelemetryVerificationResult {
    const timeDeltaHours = (newLocation.timestamp - lastLocation.timestamp) / (1000 * 3600);
    
    // Ignore updates less than 1 second apart
    if (timeDeltaHours <= 0.0002) {
      return { driverId, isAuthentic: true, fraudFlag: false, computedSpeedKmH: 0, riskPenalty: 0 };
    }

    const distanceKm = RouteSegmentationEngine.haversineDistance(
      lastLocation.lat,
      lastLocation.lng,
      newLocation.lat,
      newLocation.lng
    );

    const computedSpeedKmH = Math.round(distanceKm / timeDeltaHours);

    // Speed anomaly threshold (e.g. >150 km/h is physically impossible for rural vehicle transit)
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
  public static detectIncentiveGaming(driverId: string, cancellationCount24h: number): { gamingDetected: boolean; action: string } {
    if (cancellationCount24h >= 4) {
      return { gamingDetected: true, action: 'SUSPEND_INCENTIVES_AND_FLAG_AUDIT' };
    }
    return { gamingDetected: false, action: 'ALLOW' };
  }
}
