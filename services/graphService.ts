
import { API_BASE_URL } from '../config';
import { RouteDefinition, LocationData } from '../types';
import { defaultRoutingService } from './RoutingService';

let UNIVERSAL_ROUTES: RouteDefinition[] = [];

export const setUniversalRoutes = (routes: RouteDefinition[]) => {
    UNIVERSAL_ROUTES = routes;
};

// --- CORE FUNCTIONALITY ---

export const findDetailedPath = (startName: string, endName: string): string[] => {
    // Simple fallback logic if offline
    return [startName, endName];
};

// NEW: Smart Route using Server-Side Analysis
export const fetchSmartRoute = async (start: LocationData, end: LocationData): Promise<{ path: string[], distance: number, pathDetails: {name: string, lat: number, lng: number}[] }> => {
    try {
        const routeResponse = await defaultRoutingService.getRoute(start, end);
        
        // Ensure start and end names are always in the path array
        const path = [start.name];
        
        // Add random intermediate villages if desired or just keep start/end
        path.push(end.name);

        return { 
            path,
            distance: routeResponse.distance / 1000, // Return km
            pathDetails: routeResponse.pathDetails.map((p) => ({ name: 'Waypoint', lat: p.lat, lng: p.lng }))
        };

    } catch (error) {
        console.warn("Smart routing failed, using linear fallback.", error);
        // Really simple fallback
        return { 
            path: [start.name, end.name], 
            distance: 10,
            pathDetails: [{name: start.name, lat: start.lat, lng: start.lng}, {name: end.name, lat: end.lat, lng: end.lng}]
        };
    }
};

export const calculatePathDistance = (pathNames: string[]): number => {
  return pathNames.length * 5; 
};

export const getDemandLevel = (stopName: string): 'LOW' | 'MED' | 'HIGH' => {
  return 'MED';
};
