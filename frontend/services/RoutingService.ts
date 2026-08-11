import { LocationData } from '@villagelink/shared';
import { API_BASE_URL } from '../config';

export type RouteEngine = 'GOOGLE' | 'MAPBOX';

export interface RouteResponse {
  distance: number; // in meters
  estimatedTime: number; // in seconds
  pathDetails: { lat: number; lng: number }[];
  engineUsed: RouteEngine;
  alternatives?: {
    distance: number;
    estimatedTime: number;
    pathDetails: { lat: number; lng: number }[];
  }[];
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export class RoutingService {
  private activeEngine: RouteEngine = 'GOOGLE';
  private cache = new Map<string, RouteResponse>();

  constructor(preferredEngine: RouteEngine = 'GOOGLE') {
    this.activeEngine = preferredEngine;
  }

  public setEngine(engine: RouteEngine) {
    this.activeEngine = engine;
  }

  /**
   * VNIS Layer 2 Corridor Snapping: Intersects route polyline with 4,75,014 Village Nodes
   */
  public async getVNISCorridorSequence(polylinePoints: Array<{ lat: number; lng: number }>, bufferKm = 0.8) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/vnis/corridor/snap-polyline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polylinePoints, bufferKm })
      });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (e) {
      console.warn('[RoutingService] VNIS Corridor Snapping Error:', e);
      return null;
    }
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  public async getRoute(source: LocationData, destination: LocationData): Promise<RouteResponse> {
    if (!source || !destination) {
      throw new Error("Invalid source or destination for route calculation.");
    }

    const cacheKey = `${source.lat.toFixed(4)},${source.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    if (this.cache.has(cacheKey)) {
      console.log(`[RoutingService] Cache HIT for route: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    try {
      let route: RouteResponse;
      if (this.activeEngine === 'GOOGLE' && GOOGLE_MAPS_KEY) {
        route = await this.fetchGoogleRoute(source, destination);
      } else {
        route = await this.fetchMapboxRoute(source, destination);
      }
      this.cache.set(cacheKey, route);
      return route;
    } catch (error) {
      console.warn(`[RoutingService] Primary engine ${this.activeEngine} failed, falling back to alternative.`);
      const fallbackEngine = this.activeEngine === 'GOOGLE' ? 'MAPBOX' : 'GOOGLE';
      
      try {
        let route: RouteResponse;
        if (fallbackEngine === 'GOOGLE' && GOOGLE_MAPS_KEY) {
          route = await this.fetchGoogleRoute(source, destination);
        } else {
          route = await this.fetchMapboxRoute(source, destination);
        }
        this.cache.set(cacheKey, route);
        return route;
      } catch (fallbackError) {
        const dist = this.calculateHaversineDistance(source.lat, source.lng, destination.lat, destination.lng);
        const straightLineRoute: RouteResponse = {
          distance: dist,
          estimatedTime: Math.round(dist / 10), // average 36 km/h
          pathDetails: [
            { lat: source.lat, lng: source.lng },
            { lat: destination.lat, lng: destination.lng }
          ],
          engineUsed: 'MAPBOX'
        };
        this.cache.set(cacheKey, straightLineRoute);
        return straightLineRoute;
      }
    }
  }

  private decodePolyline(encoded: string): { lat: number; lng: number }[] {
    const points: { lat: number; lng: number }[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  }

  private async fetchGoogleRoute(source: LocationData, destination: LocationData): Promise<RouteResponse> {
    let routesList: any[] = [];
    
    // 1. Get detailed road geometry and alternatives using free OSRM router
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const osrmRes = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (osrmRes.ok) {
        const data = await osrmRes.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          routesList = data.routes.map((r: any) => ({
            pathDetails: r.geometry.coordinates.map((c: any) => ({
              lat: c[1],
              lng: c[0]
            })),
            distance: r.distance,
            estimatedTime: r.duration
          }));
        }
      }
    } catch (e) {
      console.warn("OSRM routing fallback failed", e);
    }

    if (routesList.length === 0) {
      routesList.push({
        pathDetails: [
          { lat: source.lat, lng: source.lng },
          { lat: destination.lat, lng: destination.lng }
        ],
        distance: 10000,
        estimatedTime: 600
      });
    }

    // 2. Fetch precise Google road distance using the Distance Matrix proxy endpoint
    let googleDistance = routesList[0].distance;
    let googleDuration = routesList[0].estimatedTime;
    
    try {
      const dmUrl = `${API_BASE_URL}/api/india/distance?origins=${source.lat},${source.lng}&destinations=${destination.lat},${destination.lng}`;
      const dmRes = await fetch(dmUrl);
      if (dmRes.ok) {
        const json = await dmRes.json();
        if (json.success && json.data?.status === 'OK' && json.data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const element = json.data.rows[0].elements[0];
          googleDistance = element.distance.value;
          googleDuration = element.duration.value;
          console.log(`[Google Distance Matrix Proxy] Resolved distance: ${googleDistance}m`);
        }
      }
    } catch (e) {
      console.warn("Google Distance Matrix call failed, using OSRM fallback value", e);
    }

    // Calibrate OSRM distances against Google Distance Matrix ratio
    const primaryOsrmDist = routesList[0].distance || 1;
    const calibrationRatio = googleDistance / primaryOsrmDist;

    const formattedRoutes = routesList.map((route, idx) => {
      const isPrimary = idx === 0;
      return {
        distance: isPrimary ? googleDistance : Math.round(route.distance * calibrationRatio),
        estimatedTime: isPrimary ? googleDuration : Math.round(route.estimatedTime * calibrationRatio),
        pathDetails: route.pathDetails
      };
    });

    const primaryRoute = formattedRoutes[0];
    const alternatives = formattedRoutes.slice(1);

    return {
      distance: primaryRoute.distance,
      estimatedTime: primaryRoute.estimatedTime,
      pathDetails: primaryRoute.pathDetails,
      engineUsed: 'GOOGLE',
      alternatives: alternatives.length > 0 ? alternatives : undefined
    };
  }

  private async fetchMapboxRoute(source: LocationData, destination: LocationData): Promise<RouteResponse> {
    if (!source || !destination ||
        typeof source.lat !== 'number' || isNaN(source.lat) ||
        typeof source.lng !== 'number' || isNaN(source.lng) ||
        typeof destination.lat !== 'number' || isNaN(destination.lat) ||
        typeof destination.lng !== 'number' || isNaN(destination.lng)) {
      throw new Error("Invalid coordinates provided to Mapbox.");
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${source.lng},${source.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Mapbox Directions API failed");

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) throw new Error("No route found from Mapbox");

    const route = data.routes[0];
    const pathDetails = route.geometry.coordinates.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0]
    }));

    return {
      distance: route.distance,
      estimatedTime: route.duration,
      pathDetails,
      engineUsed: 'MAPBOX'
    };
  }
}

export const defaultRoutingService = new RoutingService();
