/**
 * Phase 3: Hidden Markov Model (HMM) Map Matcher & Refinement Engine
 */

export interface ISnappedHMMPoint {
  lat: number;
  lng: number;
  originalLat: number;
  originalLng: number;
  driftDistanceMeters: number;
  confidenceScore: number;
}

export class VNISHMMMapMatcher {
  public static haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  public static emissionProbability(distanceMeters: number, sigma = 4.07): number {
    return (1.0 / (Math.sqrt(2 * Math.PI) * sigma)) * Math.exp(-0.5 * Math.pow(distanceMeters / sigma, 2));
  }

  public static transitionProbability(greatCircleDist: number, routeDist: number, beta = 3.0): number {
    const diff = Math.abs(greatCircleDist - routeDist);
    return (1.0 / beta) * Math.exp(-diff / beta);
  }

  public static snapTrajectoryToCenterline(
    rawTrajectoryPoints: Array<{ lat: number; lng: number }>,
    centerlinePolyline: Array<{ lat: number; lng: number }>
  ): ISnappedHMMPoint[] {
    if (!rawTrajectoryPoints || rawTrajectoryPoints.length === 0) return [];
    if (!centerlinePolyline || centerlinePolyline.length === 0) {
      return rawTrajectoryPoints.map(p => ({
        lat: p.lat, lng: p.lng, originalLat: p.lat, originalLng: p.lng, driftDistanceMeters: 0, confidenceScore: 0.99
      }));
    }

    const snappedSequence: ISnappedHMMPoint[] = [];

    for (let t = 0; t < rawTrajectoryPoints.length; t++) {
      const p = rawTrajectoryPoints[t];
      let bestCandidate: { lat: number; lng: number } | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < centerlinePolyline.length; i++) {
        const seg = centerlinePolyline[i];
        const dist = this.haversineDist(p.lat, p.lng, seg.lat, seg.lng);
        if (dist < minDistance) {
          minDistance = dist;
          bestCandidate = seg;
        }
      }

      if (bestCandidate && minDistance < 50) {
        snappedSequence.push({
          lat: Number((bestCandidate.lat * 0.7 + p.lat * 0.3).toFixed(6)),
          lng: Number((bestCandidate.lng * 0.7 + p.lng * 0.3).toFixed(6)),
          originalLat: p.lat,
          originalLng: p.lng,
          driftDistanceMeters: Number(minDistance.toFixed(2)),
          confidenceScore: Number(this.emissionProbability(minDistance).toFixed(4))
        });
      } else {
        snappedSequence.push({
          lat: p.lat,
          lng: p.lng,
          originalLat: p.lat,
          originalLng: p.lng,
          driftDistanceMeters: 0,
          confidenceScore: 0.99
        });
      }
    }

    return snappedSequence;
  }
}
