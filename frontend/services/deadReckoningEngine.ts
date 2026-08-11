/**
 * VillageLink Sensor Dead-Reckoning Engine
 * 
 * Kinetic inertia navigator using mobile device Accelerometer & Gyroscope sensors
 * to extrapolate vehicle location along OSM road polyline when GPS hardware and GSM internet network drop to ZERO.
 */

export interface IKinematicState {
  velocityKmH: number;
  bearingDeg: number;
  lat: number;
  lng: number;
  isSensorActive: boolean;
}

export class DeadReckoningEngine {
  private currentLat: number;
  private currentLng: number;
  private currentVelocityKmH: number = 30; // Default baseline 30 km/h
  private currentBearingDeg: number = 0;
  private lastTimestamp: number = Date.now();
  private isListening = false;
  private roadPolyline: Array<{ lat: number; lng: number }> = [];

  constructor(initialLat = 25.5941, initialLng = 85.1376) {
    this.currentLat = initialLat;
    this.currentLng = initialLng;
    this.initSensors();
  }

  /**
   * Sets current active OSM road polyline for map-matching constraint
   */
  public setRoadPolyline(polyline: Array<{ lat: number; lng: number }>): void {
    this.roadPolyline = polyline;
  }

  private initSensors(): void {
    if (typeof window === 'undefined') return;

    // Listen for Gyroscope Orientation
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
        if (e.alpha !== null && e.alpha !== undefined) {
          this.currentBearingDeg = e.alpha;
        }
      });
    }

    // Listen for Accelerometer Motion
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
        if (e.acceleration) {
          const ax = e.acceleration.x || 0;
          const ay = e.acceleration.y || 0;
          const fwdAccel = Math.sqrt(ax * ax + ay * ay);

          // Integrate forward acceleration over time step
          const now = Date.now();
          const dtSeconds = Math.max(0.1, (now - this.lastTimestamp) / 1000.0);
          this.lastTimestamp = now;

          if (fwdAccel > 0.3) {
            const deltaV = fwdAccel * 3.6 * dtSeconds; // Convert m/s^2 to km/h
            this.currentVelocityKmH = Math.min(110, Math.max(5, this.currentVelocityKmH + deltaV * 0.2));
          }
        }
      });
      this.isListening = true;
    }
  }

  /**
   * Extrapolates current position along road trajectory
   */
  public updatePosition(dtSeconds = 1.0): IKinematicState {
    const now = Date.now();
    const dt = dtSeconds || (now - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = now;

    const velocityMetersPerSec = (this.currentVelocityKmH * 1000) / 3600.0;
    const distanceMeters = velocityMetersPerSec * dt;

    // Convert distance into lat/lng delta
    const radBearing = (this.currentBearingDeg * Math.PI) / 180.0;
    const deltaLat = (distanceMeters * Math.cos(radBearing)) / 111111.0;
    const deltaLng = (distanceMeters * Math.sin(radBearing)) / (111111.0 * Math.cos((this.currentLat * Math.PI) / 180.0));

    let rawLat = this.currentLat + deltaLat;
    let rawLng = this.currentLng + deltaLng;

    // Map-matching: snap to nearest segment on active road polyline if available
    if (this.roadPolyline && this.roadPolyline.length >= 2) {
      let minDist = Infinity;
      let snappedPt = { lat: rawLat, lng: rawLng };

      for (let i = 0; i < this.roadPolyline.length - 1; i++) {
        const p1 = this.roadPolyline[i];
        const p2 = this.roadPolyline[i + 1];

        // Project point onto segment
        const dX = p2.lng - p1.lng;
        const dY = p2.lat - p1.lat;
        if (dX === 0 && dY === 0) continue;

        const t = Math.max(0, Math.min(1, ((rawLng - p1.lng) * dX + (rawLat - p1.lat) * dY) / (dX * dX + dY * dY)));
        const projLat = p1.lat + t * dY;
        const projLng = p1.lng + t * dX;
        const dist = Math.hypot(rawLat - projLat, rawLng - projLng);

        if (dist < minDist) {
          minDist = dist;
          snappedPt = { lat: projLat, lng: projLng };
        }
      }

      rawLat = snappedPt.lat;
      rawLng = snappedPt.lng;
    }

    this.currentLat = Number(rawLat.toFixed(6));
    this.currentLng = Number(rawLng.toFixed(6));

    return {
      lat: this.currentLat,
      lng: this.currentLng,
      velocityKmH: Math.round(this.currentVelocityKmH),
      bearingDeg: Math.round(this.currentBearingDeg),
      isSensorActive: this.isListening
    };
  }
}

export const deadReckoningEngine = new DeadReckoningEngine();
