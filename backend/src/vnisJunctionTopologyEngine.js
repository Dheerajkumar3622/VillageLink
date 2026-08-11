/**
 * VNIS Junction Topology Engine (Backend Node ESM)
 */

export class VNISJunctionTopologyEngine {
  static calculatePerpendicularCenterlineSnap(nodeLat, nodeLng, p1Lat, p1Lng, p2Lat, p2Lng) {
    const dX = p2Lng - p1Lng;
    const dY = p2Lat - p1Lat;
    const lenSq = dX * dX + dY * dY;

    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((nodeLng - p1Lng) * dX + (nodeLat - p1Lat) * dY) / lenSq));
    }

    const snapLat = p1Lat + t * dY;
    const snapLng = p1Lng + t * dX;

    const R = 6371000;
    const dLat = ((snapLat - nodeLat) * Math.PI) / 180;
    const dLon = ((snapLng - nodeLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((nodeLat * Math.PI) / 180) *
        Math.cos((snapLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const perpDistMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return {
      snapLat: Number(snapLat.toFixed(6)),
      snapLng: Number(snapLng.toFixed(6)),
      perpDistMeters: Math.round(perpDistMeters),
      projectionRatio: t
    };
  }

  static classifyJunctionTopology(p0, p1, p2) {
    const v1x = p1.lng - p0.lng;
    const v1y = p1.lat - p0.lat;
    const v2x = p2.lng - p1.lng;
    const v2y = p2.lat - p1.lat;

    const dotProduct = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 === 0 || mag2 === 0) {
      return { junctionType: 'STRAIGHT_CROSSING', turnAngleDeg: 0, badgeLabel: 'Straight Highway', badgeHindiLabel: 'सीधा रास्ता' };
    }

    const cosTheta = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
    const angleRad = Math.acos(cosTheta);
    const turnAngleDeg = Math.round((angleRad * 180) / Math.PI);

    if (turnAngleDeg >= 65 && turnAngleDeg <= 115) {
      return { junctionType: 'T_JUNCTION_CHOWK', turnAngleDeg, badgeLabel: '🛑 T-Chowk Mode', badgeHindiLabel: '🛑 टी-चौक मोड़' };
    } else if (turnAngleDeg >= 25 && turnAngleDeg < 65) {
      return { junctionType: 'Y_FORK_BRANCH', turnAngleDeg, badgeLabel: '🔀 Y-Fork Branch', badgeHindiLabel: '🔀 वाई-कांटा मोड़' };
    } else {
      return { junctionType: 'STRAIGHT_CROSSING', turnAngleDeg, badgeLabel: 'Straight Crossing', badgeHindiLabel: 'सीधा रास्ता' };
    }
  }

  static isPointInsideGramPanchayatPolygon(pt, polygonRing) {
    if (!polygonRing || polygonRing.length < 3) return true;
    let inside = false;
    for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
      const xi = polygonRing[i].lng, yi = polygonRing[i].lat;
      const xj = polygonRing[j].lng, yj = polygonRing[j].lat;
      const intersect =
        yi > pt.lat !== yj > pt.lat &&
        pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
