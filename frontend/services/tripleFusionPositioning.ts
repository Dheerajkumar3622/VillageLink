/**
 * VillageLink Triple-Fusion Positioning Service
 * 
 * Multi-source spatial positioning solver:
 * Priority 1: High-Accuracy GPS (< 15m)
 * Priority 2: GSM Cell-Tower Triangulation (Jio/Airtel/Vi/BSNL MCC 404/405)
 * Priority 3: Road Dead-Reckoning Extrapolator (Device Accelerometer/Gyro Motion)
 */

import { API_BASE_URL } from '../config';
import { deadReckoningEngine } from './deadReckoningEngine';

export type LocationSource = 'GPS_HIGH_ACCURACY' | 'GSM_CELL_TRIANGULATION' | 'DEAD_RECKONING_ROADS';

export interface IFusedLocation {
  lat: number;
  lng: number;
  accuracyMeters: number;
  source: LocationSource;
  operatorName?: string;
  speedKmH?: number;
  bearingDeg?: number;
}

export class TripleFusionPositioning {
  private lastKnownLocation: IFusedLocation | null = null;
  private isListeningMotion = false;
  private currentBearing = 0;

  constructor() {
    this.initMotionListeners();
  }

  private initMotionListeners(): void {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.alpha !== null) {
          this.currentBearing = e.alpha;
        }
      });
      this.isListeningMotion = true;
    }
  }

  /**
   * Resolves current fused location from available hardware telemetry inputs
   */
  public async getFusedPosition(
    gpsCoords?: { lat: number; lng: number; accuracy: number; speed?: number },
    gsmCellTowers?: Array<{ mcc: number; mnc: number; lac: number; cid: number; signalStrengthDbm?: number }>
  ): Promise<IFusedLocation> {
    // 1. Priority 1: High Accuracy GPS
    if (gpsCoords && gpsCoords.accuracy <= 25) {
      const result: IFusedLocation = {
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        accuracyMeters: Math.round(gpsCoords.accuracy),
        source: 'GPS_HIGH_ACCURACY',
        speedKmH: gpsCoords.speed ? Math.round(gpsCoords.speed * 3.6) : 0,
        bearingDeg: this.currentBearing
      };
      this.lastKnownLocation = result;
      return result;
    }

    // 2. Priority 2: GSM Cell-Tower Triangulation
    if (gsmCellTowers && gsmCellTowers.length > 0) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vnis/telemetry/gsm-locate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ towers: gsmCellTowers })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const result: IFusedLocation = {
              lat: json.data.lat,
              lng: json.data.lng,
              accuracyMeters: json.data.accuracyMeters || 200,
              source: 'GSM_CELL_TRIANGULATION',
              operatorName: json.data.operatorName,
              bearingDeg: this.currentBearing
            };
            this.lastKnownLocation = result;
            return result;
          }
        }
      } catch (e) {
        console.warn('[TripleFusionPositioning] GSM Triangulation API error:', e);
      }
    }

    // 3. Priority 3: Dead-Reckoning Extrapolation along OSM Road Network using Sensor Motion
    const deadState = deadReckoningEngine.updatePosition(1.0);
    const result: IFusedLocation = {
      lat: deadState.lat,
      lng: deadState.lng,
      accuracyMeters: 40,
      source: 'DEAD_RECKONING_ROADS',
      speedKmH: deadState.velocityKmH,
      bearingDeg: deadState.bearingDeg
    };
    this.lastKnownLocation = result;
    return result;

    // Fallback default coordinates (Bihar Central Corridor)
    return {
      lat: 25.5941,
      lng: 85.1376,
      accuracyMeters: 500,
      source: 'GSM_CELL_TRIANGULATION',
      operatorName: 'Jio / Airtel Rural Network'
    };
  }
}

export const tripleFusionPositioning = new TripleFusionPositioning();
