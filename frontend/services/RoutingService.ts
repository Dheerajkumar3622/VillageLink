import { LocationData } from '@villagelink/shared';

export type RouteEngine = 'GOOGLE' | 'MAPBOX';

export interface RouteResponse {
  distance: number; // in meters
  estimatedTime: number; // in seconds
  pathDetails: { lat: number; lng: number }[];
  engineUsed: RouteEngine;
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export class RoutingService {
  private activeEngine: RouteEngine = 'MAPBOX';

  constructor(preferredEngine: RouteEngine = 'MAPBOX') {
    this.activeEngine = preferredEngine;
  }

  public setEngine(engine: RouteEngine) {
    this.activeEngine = engine;
  }

  public async getRoute(source: LocationData, destination: LocationData): Promise<RouteResponse> {
    try {
      if (this.activeEngine === 'GOOGLE' && GOOGLE_MAPS_KEY) {
        return await this.fetchGoogleRoute(source, destination);
      } else {
        return await this.fetchMapboxRoute(source, destination);
      }
    } catch (error) {
      console.warn(`[RoutingService] Primary engine ${this.activeEngine} failed, falling back to alternative.`);
      const fallbackEngine = this.activeEngine === 'GOOGLE' ? 'MAPBOX' : 'GOOGLE';
      
      try {
        if (fallbackEngine === 'GOOGLE' && GOOGLE_MAPS_KEY) {
          return await this.fetchGoogleRoute(source, destination);
        } else {
          return await this.fetchMapboxRoute(source, destination);
        }
      } catch (fallbackError) {
        throw new Error('All routing engines failed to return a path.');
      }
    }
  }

  private async fetchGoogleRoute(source: LocationData, destination: LocationData): Promise<RouteResponse> {
    const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;
    const payload = {
      origin: {
        location: {
          latLng: {
            latitude: source.lat,
            longitude: source.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng
          }
        }
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      polylineEncoding: "GEO_JSON_LINESTRING"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.geoJsonLinestring'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Google Routes API failed");

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) throw new Error("No route found from Google");

    const route = data.routes[0];
    const pathDetails = route.polyline.geoJsonLinestring.coordinates.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0]
    }));

    return {
      distance: route.distanceMeters,
      estimatedTime: parseInt(route.duration.replace('s', ''), 10),
      pathDetails,
      engineUsed: 'GOOGLE'
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
