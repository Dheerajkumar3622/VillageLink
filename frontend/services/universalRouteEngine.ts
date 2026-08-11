/**
 * Universal Route Engine
 * Single Source of Truth for Route Navigation & Village Highway Access Mode Snapping
 * Used across User App, Provider (Driver) App, and Admin Dashboard.
 */

import { API_BASE_URL } from '../config';
import { LocationData } from '@villagelink/shared';
import { defaultRoutingService } from './RoutingService';
import { offlineH3TileManager } from './offlineH3TileManager';

export interface RouteWaypointNode {
  nodeId: string;
  name: string;
  localNameHindi: string;
  lat: number;
  lng: number;
  cumulativeDistanceKm: number;
  estimatedEtaMinutes: number;
  sideOrientation?: string;
  district?: string;
  state?: string;
}

export interface UniversalRouteResult {
  pathNames: string[];
  distanceKm: number;
  waypoints: RouteWaypointNode[];
  rawPolylinePoints: { lat: number; lng: number }[];
  isFallback: boolean;
}

const getHaversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export class UniversalRouteEngine {
  /**
   * Main entry point for computing precise sequential route with main-road pickup modes ("Gaaw ke Mode")
   */
  static async computeRoute(
    origin: LocationData,
    destination: LocationData
  ): Promise<UniversalRouteResult> {
    try {
      // 1. Fetch driving polyline from Google Maps / Routing API
      const routeResponse = await defaultRoutingService.getRoute(origin, destination);
      const polyPoints = routeResponse.pathDetails.map(p => ({ lat: p.lat, lng: p.lng }));
      const totalDistKm = routeResponse.distance > 0 ? routeResponse.distance / 1000 : 10;

      // 2. Call backend VNIS Polyline Snapping API
      try {
        const snapRes = await fetch(`${API_BASE_URL}/api/vnis/corridor/snap-polyline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            polylinePoints: polyPoints,
            bufferKm: 5.0,
            speedKmH: 40,
            minNodeSpacingMeters: 50
          })
        });

        if (snapRes.ok) {
          const json = await snapRes.json();
          if (json.success && json.data && Array.isArray(json.data.nodesSequence) && json.data.nodesSequence.length > 0) {
            const sequence = json.data.nodesSequence;
            const waypoints: RouteWaypointNode[] = sequence.map((item: any, idx: number) => ({
              nodeId: item.node?.nodeId || item.nodeId || `NODE_${idx}_${Math.round((item.cumulativeDistanceKm || 0) * 100)}`,
              name: item.displayName || item.node?.name || 'Village Mode',
              localNameHindi: item.displayHindiName || item.node?.localNameHindi || item.name,
              lat: item.node?.loc?.coordinates?.[1] || item.pointOnPolyline?.lat || 0,
              lng: item.node?.loc?.coordinates?.[0] || item.pointOnPolyline?.lng || 0,
              cumulativeDistanceKm: item.cumulativeDistanceKm || 0,
              estimatedEtaMinutes: item.estimatedEtaMinutes || 0,
              sideOrientation: item.highwaySide || item.sideOrientation || 'CENTER',
              district: item.node?.district || '',
              state: item.node?.state || ''
            }));

            const pathNames = [
              origin.name,
              ...waypoints.map(w => w.name).filter(n => n !== origin.name && n !== destination.name),
              destination.name
            ];

            return {
              pathNames,
              distanceKm: totalDistKm,
              waypoints,
              rawPolylinePoints: polyPoints,
              isFallback: false
            };
          }
        }
      } catch (err) {
        console.warn('[UniversalRouteEngine] Backend snapping API failed, using offline H3 tile fallback', err);
      }

      // 3. Offline IndexedDB Tile Snapping Fallback
      try {
        const offlineNodes = await offlineH3TileManager.snapOfflineCorridorPoints(polyPoints, 1.5);
        if (offlineNodes && offlineNodes.length > 0) {
          const waypoints: RouteWaypointNode[] = offlineNodes.map((n, idx) => ({
            nodeId: n.nodeId || `OFFLINE_NODE_${idx}`,
            name: n.name,
            localNameHindi: n.localNameHindi || n.name,
            lat: n.lat,
            lng: n.lng,
            cumulativeDistanceKm: Number(((idx / Math.max(1, offlineNodes.length - 1)) * totalDistKm).toFixed(2)),
            estimatedEtaMinutes: Math.round((totalDistKm / 40) * 60),
            district: n.district,
            state: n.state
          }));

          return {
            pathNames: [origin.name, ...waypoints.map(w => w.name), destination.name],
            distanceKm: totalDistKm,
            waypoints,
            rawPolylinePoints: polyPoints,
            isFallback: false
          };
        }
      } catch (err) {
        console.warn('[UniversalRouteEngine] Offline IndexedDB snapping failed', err);
      }

      // 4. Default Fallback
      return {
        pathNames: [origin.name, destination.name],
        distanceKm: totalDistKm,
        waypoints: [
          { nodeId: 'START', name: origin.name, localNameHindi: origin.name, lat: origin.lat || 0, lng: origin.lng || 0, cumulativeDistanceKm: 0, estimatedEtaMinutes: 0 },
          { nodeId: 'END', name: destination.name, localNameHindi: destination.name, lat: destination.lat || 0, lng: destination.lng || 0, cumulativeDistanceKm: totalDistKm, estimatedEtaMinutes: Math.round((totalDistKm / 40) * 60) }
        ],
        rawPolylinePoints: polyPoints,
        isFallback: true
      };

    } catch (e) {
      console.error('[UniversalRouteEngine] Routing failed:', e);
      return {
        pathNames: [origin.name, destination.name],
        distanceKm: 10,
        waypoints: [],
        rawPolylinePoints: [],
        isFallback: true
      };
    }
  }
}
