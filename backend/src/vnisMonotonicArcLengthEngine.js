/**
 * VNIS Monotonic Arc Length Engine (Backend Node ESM)
 */

import { VNISJunctionTopologyEngine } from './vnisJunctionTopologyEngine.js';

export class VNISMonotonicArcLengthEngine {
  static haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static snapAndSortMonotonic(polylinePoints, candidateNodes, bufferMeters = 800) {
    if (!polylinePoints || polylinePoints.length < 2 || candidateNodes.length === 0) {
      return [];
    }

    const cumulativeDistances = [0];
    let totalLength = 0;
    for (let i = 0; i < polylinePoints.length - 1; i++) {
      const dist = this.haversineDistanceMeters(
        polylinePoints[i].lat, polylinePoints[i].lng,
        polylinePoints[i + 1].lat, polylinePoints[i + 1].lng
      );
      totalLength += dist;
      cumulativeDistances.push(totalLength);
    }

    const projectedStops = [];

    for (const node of candidateNodes) {
      let minPerpDist = Infinity;
      let bestArcLength = -1;
      let bestSide = 'CENTER';
      let bestPoint = { lat: node.lat, lng: node.lng };

      for (let i = 0; i < polylinePoints.length - 1; i++) {
        const p1 = polylinePoints[i];
        const p2 = polylinePoints[i + 1];

        const dX = p2.lng - p1.lng;
        const dY = p2.lat - p1.lat;
        const lenSq = dX * dX + dY * dY;

        let t = 0;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, ((node.lng - p1.lng) * dX + (node.lat - p1.lat) * dY) / lenSq));
        }

        const projLat = p1.lat + t * dY;
        const projLng = p1.lng + t * dX;
        const perpDist = this.haversineDistanceMeters(node.lat, node.lng, projLat, projLng);

        if (perpDist <= bufferMeters && perpDist < minPerpDist) {
          minPerpDist = perpDist;
          const segLen = cumulativeDistances[i + 1] - cumulativeDistances[i];
          bestArcLength = cumulativeDistances[i] + t * segLen;
          bestPoint = { lat: projLat, lng: projLng };

          const crossProduct = (p2.lng - p1.lng) * (node.lat - p1.lat) - (p2.lat - p1.lat) * (node.lng - p1.lng);
          if (crossProduct > 0.000001) {
            bestSide = 'LEFT';
          } else if (crossProduct < -0.000001) {
            bestSide = 'RIGHT';
          } else {
            bestSide = 'CENTER';
          }
        }
      }

      if (bestArcLength >= 0) {
        projectedStops.push({
          node,
          arcLengthMeters: bestArcLength,
          perpDistMeters: minPerpDist,
          side: bestSide,
          pointOnPolyline: bestPoint
        });
      }
    }

    projectedStops.sort((a, b) => a.arcLengthMeters - b.arcLengthMeters);

    const result = [];

    for (let i = 0; i < projectedStops.length; i++) {
      const current = projectedStops[i];

      if (result.length > 0) {
        const lastHub = result[result.length - 1];
        const distToLast = Math.abs(current.arcLengthMeters - lastHub.arcLengthKm * 1000);

        if (distToLast <= 50) {
          if (!lastHub.coLocatedVillages.includes(current.node.name)) {
            lastHub.coLocatedVillages.push(current.node.name);
            lastHub.isJunctionHub = true;
            lastHub.displayName = `${lastHub.name} - ${current.node.name} Mode`;
            lastHub.displayHindiName = `${lastHub.name} - ${current.node.name} मोड़`;
          }
          continue;
        }
      }

      const sidePrefix = current.side === 'LEFT' ? '👈 ' : current.side === 'RIGHT' ? '👉 ' : '';
      let junctionTag = '';
      if (i > 0 && i < polylinePoints.length - 1) {
        const topology = VNISJunctionTopologyEngine.classifyJunctionTopology(
          polylinePoints[i - 1],
          polylinePoints[i],
          polylinePoints[i + 1]
        );
        if (topology.junctionType !== 'STRAIGHT_CROSSING') {
          junctionTag = ` (${topology.badgeHindiLabel})`;
        }
      }

      result.push({
        nodeId: current.node.nodeId,
        name: current.node.name,
        displayName: `${sidePrefix}${current.node.name}`,
        displayHindiName: `${sidePrefix}${current.node.localNameHindi || current.node.name}${junctionTag}`,
        arcLengthKm: Number((current.arcLengthMeters / 1000).toFixed(2)),
        perpendicularDistMeters: Math.round(current.perpDistMeters),
        sideOrientation: current.side,
        isJunctionHub: false,
        coLocatedVillages: [current.node.name],
        pointOnPolyline: current.pointOnPolyline
      });
    }

    return result;
  }
}
