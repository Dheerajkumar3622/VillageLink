
import { API_BASE_URL } from '../config';
import { RouteDefinition, LocationData } from '../types';

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
        const response = await fetch(`${API_BASE_URL}/api/routes/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end })
        });
        
        if (!response.ok) throw new Error("Route analysis failed");
        
        const data = await response.json();
        
        return { 
            path: data.path, // The server now returns the accurate list of villages intersecting the route
            distance: data.distance,
            pathDetails: data.pathDetails || [] // Actual coords
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
