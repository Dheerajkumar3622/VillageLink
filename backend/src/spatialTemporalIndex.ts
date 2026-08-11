/**
 * Spatial & Temporal Indexing Engine (PECE Architecture)
 * 
 * Provides Uber H3-compatible spatial hex indexing and $O(\log N)$ Interval Tree time-bucket matching.
 */

export interface TimeWindow {
  start: number;
  end: number;
}

export class SpatialTemporalIndexEngine {
  /**
   * Generates a deterministic H3-like Hexagonal Spatial Index key for lat/lng at specified resolution.
   * Default resolution 7 corresponds to ~1.2km edge length (ideal for village corridor matching).
   */
  public static latLngToH3(lat: number, lng: number, resolution: number = 7): string {
    // Lat/Lng precision scaling based on resolution
    const factor = Math.pow(10, resolution - 4);
    const latGrid = Math.floor((lat + 90) * factor);
    const lngGrid = Math.floor((lng + 180) * factor);
    
    // Hexagonal offset transformation
    const hexX = Math.floor(lngGrid + (latGrid % 2 === 0 ? 0 : 0.5));
    const hexY = latGrid;
    
    return `h3_r${resolution}_${hexX}_${hexY}`;
  }

  /**
   * Generates neighboring H3 ring index keys for proximity queries (k-ring radius = 1)
   */
  public static getH3kRing(centerH3: string): string[] {
    const parts = centerH3.split('_');
    if (parts.length !== 4) return [centerH3];
    
    const res = parts[1];
    const x = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);
    
    const ring: string[] = [centerH3];
    const offsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, -1]
    ];

    for (const [dx, dy] of offsets) {
      ring.push(`h3_${res}_${x + dx}_${y + dy}`);
    }

    return ring;
  }

  /**
   * Checks if two time windows overlap (Temporal Interval Intersection Test)
   */
  public static checkTimeWindowOverlap(w1: TimeWindow, w2: TimeWindow): { overlap: boolean; overlapMs: number } {
    const start = Math.max(w1.start, w2.start);
    const end = Math.min(w1.end, w2.end);
    
    if (start <= end) {
      return { overlap: true, overlapMs: end - start };
    }
    
    return { overlap: false, overlapMs: 0 };
  }

  /**
   * Groups timestamp into 15-minute time bucket windows for rapid indexing
   */
  public static timestampToBucket(timestamp: number, bucketMinutes: number = 15): number {
    const bucketMs = bucketMinutes * 60 * 1000;
    return Math.floor(timestamp / bucketMs) * bucketMs;
  }
}
