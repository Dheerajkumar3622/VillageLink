
import { API_BASE_URL } from '../config';
import { RouteDefinition, LocationData } from '@villagelink/shared';
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

// NEW: Smart Route using Server-Side Analysis and OfflineRouter
import { OfflineRouter, RoutingData } from '../utils/OfflineRouter';

let cachedRouter: OfflineRouter | null = null;
let currentAreaGraphId: string | null = null;

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

const getOfflineRouteLandmarks = async (pathDetails: { lat: number; lng: number }[]): Promise<string[]> => {
    if (!pathDetails || pathDetails.length === 0) return [];

    // Select actual route coordinates (nodes/junctions) with minimum 900 meters spacing (fits 800m - 1km perfectly)
    const checkPoints: { lat: number; lng: number }[] = [];
    checkPoints.push(pathDetails[0]);
    let lastPt = pathDetails[0];

    for (let i = 1; i < pathDetails.length; i++) {
        const curr = pathDetails[i];
        const d = getDistance(lastPt.lat, lastPt.lng, curr.lat, curr.lng);
        if (d >= 0.9) { // Minimum 900 meters (0.9 km) distance between consecutive checkpoints
            checkPoints.push(curr);
            lastPt = curr;
        }
    }

    // Always include the destination
    const dest = pathDetails[pathDetails.length - 1];
    const lastAdded = checkPoints[checkPoints.length - 1];
    if (getDistance(lastAdded.lat, lastAdded.lng, dest.lat, dest.lng) > 0.1) {
        checkPoints.push(dest);
    }

    try {
        // Resolve names in batches of 15 to stay extremely fast, smooth, and browser-friendly
        const batchSize = 15;
        const resolvedNames: string[] = [];

        for (let i = 0; i < checkPoints.length; i += batchSize) {
            const batch = checkPoints.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (cp) => {
                    try {
                        const url = `${API_BASE_URL}/api/india/reverse-geocode?lat=${cp.lat}&lng=${cp.lng}&result_type=locality|sublocality|neighborhood|administrative_area_level_3`;
                        const res = await fetch(url);
                        if (!res.ok) return null;
                        const json = await res.json();
                        if (!json.success || !json.data || !json.data.results || json.data.results.length === 0) return null;

                        const results = json.data.results;
                        let villageName = null;

                        // 1. Search sublocality/neighborhood (village name) in any of the returned geocoded features
                        for (const r of results) {
                            const comps = r.address_components || [];
                            const sublocality = comps.find((c: any) => 
                                c.types.includes('sublocality_level_1') || 
                                c.types.includes('sublocality') || 
                                c.types.includes('neighborhood')
                            );
                            if (sublocality && sublocality.long_name) {
                                villageName = sublocality.long_name;
                                break;
                            }
                        }

                        // 2. Fallback: Search locality
                        if (!villageName) {
                            for (const r of results) {
                                const comps = r.address_components || [];
                                const locality = comps.find((c: any) => c.types.includes('locality'));
                                if (locality && locality.long_name) {
                                    villageName = locality.long_name;
                                    break;
                                }
                            }
                        }

                        // 3. Fallback: Search administrative area level 3 (tehsil/block)
                        if (!villageName) {
                            for (const r of results) {
                                const comps = r.address_components || [];
                                const admin3 = comps.find((c: any) => c.types.includes('administrative_area_level_3'));
                                if (admin3 && admin3.long_name) {
                                    villageName = admin3.long_name;
                                    break;
                                }
                            }
                        }

                        return villageName || (results[0]?.formatted_address ? results[0].formatted_address.split(',')[0] : null);
                    } catch {
                        return null;
                    }
                })
            );
            
            for (const name of batchResults) {
                if (name && name.trim().length > 0) {
                    resolvedNames.push(name);
                }
            }
        }

        if (resolvedNames.length > 0) {
            const uniqueResolved = Array.from(new Set(resolvedNames));
            return uniqueResolved;
        }
    } catch (e) {
        console.warn("Google Reverse Geocoding failed, falling back to local DB match", e);
    }

    return new Promise((resolve) => {
        const worker = new Worker(new URL('../components/locationSearchWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'READY') {
                worker.postMessage({ type: 'ROUTE_LANDMARKS', payload: pathDetails });
            } else if (type === 'ROUTE_LANDMARKS_RESULT') {
                resolve(payload);
                worker.terminate();
            }
        };
        worker.postMessage({ type: 'INIT' });
    });
};

export const fetchSmartRoute = async (start: LocationData, end: LocationData): Promise<{ path: string[], distance: number, pathDetails: {name: string, lat: number, lng: number}[], alternatives?: { path: string[], distance: number, pathDetails: {name: string, lat: number, lng: number}[] }[] }> => {
    try {
        // Use client-side routing (OSRM + Google Distance Matrix proxy + Offline landmarks) directly
        const routeResponse = await defaultRoutingService.getRoute(start, end);
        const pathDetails = routeResponse.pathDetails.map((p) => ({ name: 'Waypoint', lat: p.lat, lng: p.lng }));
        
        let landmarks: string[] = [];
        try {
            landmarks = await getOfflineRouteLandmarks(pathDetails);
        } catch (e) {
            console.warn("Failed to get offline landmarks", e);
        }

        const primaryRoute = { 
            path: [start.name, ...landmarks.filter(l => l !== start.name && l !== end.name), end.name],
            distance: routeResponse.distance / 1000, // Return km
            pathDetails
        };

        const alternatives: any[] = [];
        if (routeResponse.alternatives) {
            for (const alt of routeResponse.alternatives) {
                const altDetails = alt.pathDetails.map((p) => ({ name: 'Waypoint', lat: p.lat, lng: p.lng }));
                let altLandmarks: string[] = [];
                try {
                    altLandmarks = await getOfflineRouteLandmarks(altDetails);
                } catch {}
                alternatives.push({
                    path: [start.name, ...altLandmarks.filter(l => l !== start.name && l !== end.name), end.name],
                    distance: alt.distance / 1000,
                    pathDetails: altDetails
                });
            }
        }

        return {
            ...primaryRoute,
            alternatives: alternatives.length > 0 ? alternatives : undefined
        };

    } catch (error) {
        console.warn("Smart routing failed, using linear fallback.", error);
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
