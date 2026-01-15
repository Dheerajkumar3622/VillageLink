/**
 * Route Village & POI Mapper Service
 * Maps OSRM route coordinates to actual villages and urban landmarks
 * using multiple data sources: Local DB, OpenStreetMap, Nominatim
 */

// --- TYPES ---

export interface PlaceInfo {
    name: string;
    type: PlaceType;
    lat: number;
    lng: number;
    distanceAlongRoute: number; // km from start
    source: 'LOCAL_DB' | 'OSM' | 'NOMINATIM';
}

export type PlaceType =
    | 'village'
    | 'railway_station'
    | 'bus_station'
    | 'marketplace'
    | 'hospital'
    | 'school'
    | 'temple'
    | 'petrol_station'
    | 'bank'
    | 'police'
    | 'unknown';

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface MappedRoute {
    places: PlaceInfo[];
    totalDistance: number;
    duration: number;
}

// --- CONSTANTS ---

const SAMPLE_INTERVAL_KM = 0.5; // Sample every 500m
const LOCAL_SEARCH_RADIUS_M = 2000; // 2km for local DB
const OSM_SEARCH_RADIUS_M = 1000; // 1km for OSM POIs
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

// POI type mapping from OSM tags
const OSM_TAG_TO_TYPE: Record<string, PlaceType> = {
    'railway=station': 'railway_station',
    'railway=halt': 'railway_station',
    'amenity=bus_station': 'bus_station',
    'highway=bus_stop': 'bus_station',
    'amenity=marketplace': 'marketplace',
    'shop=mall': 'marketplace',
    'amenity=hospital': 'hospital',
    'amenity=clinic': 'hospital',
    'amenity=school': 'school',
    'amenity=college': 'school',
    'amenity=university': 'school',
    'amenity=place_of_worship': 'temple',
    'amenity=fuel': 'petrol_station',
    'amenity=bank': 'bank',
    'amenity=atm': 'bank',
    'amenity=police': 'police',
};

// --- UTILITY FUNCTIONS ---

/**
 * Calculate Haversine distance between two coordinates
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Sample points along route at regular intervals
 */
export const sampleRoutePoints = (coordinates: Coordinate[], intervalKm: number = SAMPLE_INTERVAL_KM): Coordinate[] => {
    if (coordinates.length < 2) return coordinates;

    const sampledPoints: Coordinate[] = [coordinates[0]]; // Always include start
    let accumulatedDistance = 0;
    let lastSampledDistance = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        const segmentDist = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
        accumulatedDistance += segmentDist;

        // Sample at intervals
        if (accumulatedDistance - lastSampledDistance >= intervalKm) {
            sampledPoints.push(curr);
            lastSampledDistance = accumulatedDistance;
        }
    }

    // Always include end point
    const lastCoord = coordinates[coordinates.length - 1];
    if (sampledPoints[sampledPoints.length - 1] !== lastCoord) {
        sampledPoints.push(lastCoord);
    }

    return sampledPoints;
};

/**
 * Find nearest village from local MongoDB Location collection
 */
export const findLocalVillage = async (
    lat: number,
    lng: number,
    LocationModel: any
): Promise<PlaceInfo | null> => {
    try {
        const nearest = await LocationModel.findOne({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    },
                    $maxDistance: LOCAL_SEARCH_RADIUS_M
                }
            }
        }).lean();

        if (nearest) {
            return {
                name: nearest.name,
                type: 'village',
                lat: nearest.location?.coordinates?.[1] || lat,
                lng: nearest.location?.coordinates?.[0] || lng,
                distanceAlongRoute: 0, // Will be set later
                source: 'LOCAL_DB'
            };
        }
        return null;
    } catch (error) {
        console.error('Local village query error:', error);
        return null;
    }
};

/**
 * Query OpenStreetMap Overpass API for nearby POIs
 */
export const queryOSMPOIs = async (lat: number, lng: number): Promise<PlaceInfo[]> => {
    const query = `
        [out:json][timeout:10];
        (
            node["railway"="station"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
            node["railway"="halt"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
            node["amenity"="bus_station"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
            node["highway"="bus_stop"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
            node["amenity"="marketplace"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
            node["amenity"="hospital"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
            node["amenity"="fuel"](around:${OSM_SEARCH_RADIUS_M},${lat},${lng});
        );
        out body;
    `;

    try {
        const response = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.ok) return [];

        const data = await response.json();
        const places: PlaceInfo[] = [];

        for (const element of data.elements || []) {
            if (element.type === 'node' && element.tags) {
                const name = element.tags.name || element.tags['name:en'] || 'Unnamed';
                let placeType: PlaceType = 'unknown';

                // Determine type from tags
                for (const [tagCombo, type] of Object.entries(OSM_TAG_TO_TYPE)) {
                    const [key, value] = tagCombo.split('=');
                    if (element.tags[key] === value) {
                        placeType = type;
                        break;
                    }
                }

                if (placeType !== 'unknown') {
                    places.push({
                        name,
                        type: placeType,
                        lat: element.lat,
                        lng: element.lon,
                        distanceAlongRoute: 0,
                        source: 'OSM'
                    });
                }
            }
        }

        return places;
    } catch (error) {
        console.error('OSM Overpass query error:', error);
        return [];
    }
};

/**
 * Nominatim reverse geocode fallback
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<PlaceInfo | null> => {
    try {
        const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'VillageLink/1.0' }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const name = data.address?.village ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.hamlet ||
            data.address?.locality ||
            data.display_name?.split(',')[0] ||
            'Unknown';

        return {
            name,
            type: 'village',
            lat,
            lng,
            distanceAlongRoute: 0,
            source: 'NOMINATIM'
        };
    } catch (error) {
        console.error('Nominatim reverse geocode error:', error);
        return null;
    }
};

/**
 * Find place for a coordinate using all sources
 */
export const findPlaceForCoordinate = async (
    lat: number,
    lng: number,
    LocationModel: any
): Promise<PlaceInfo | null> => {
    // 1. Try local database first (fastest, works offline)
    const localVillage = await findLocalVillage(lat, lng, LocationModel);
    if (localVillage) return localVillage;

    // 2. Try OSM for urban POIs
    const osmPOIs = await queryOSMPOIs(lat, lng);
    if (osmPOIs.length > 0) {
        // Return the closest POI
        let closest = osmPOIs[0];
        let minDist = calculateDistance(lat, lng, closest.lat, closest.lng);

        for (const poi of osmPOIs.slice(1)) {
            const dist = calculateDistance(lat, lng, poi.lat, poi.lng);
            if (dist < minDist) {
                closest = poi;
                minDist = dist;
            }
        }
        return closest;
    }

    // 3. Fallback to Nominatim
    return await reverseGeocode(lat, lng);
};

/**
 * Deduplicate places - keep only unique places, prefer more significant ones
 */
export const deduplicatePlaces = (places: PlaceInfo[]): PlaceInfo[] => {
    const seen = new Map<string, PlaceInfo>();

    // Type priority (higher = more important to show)
    const typePriority: Record<PlaceType, number> = {
        railway_station: 10,
        bus_station: 9,
        hospital: 8,
        marketplace: 7,
        school: 6,
        temple: 5,
        petrol_station: 4,
        bank: 3,
        police: 3,
        village: 2,
        unknown: 1
    };

    for (const place of places) {
        const key = place.name.toLowerCase().trim();

        if (!seen.has(key)) {
            seen.set(key, place);
        } else {
            // Keep the one with higher priority type
            const existing = seen.get(key)!;
            if (typePriority[place.type] > typePriority[existing.type]) {
                seen.set(key, place);
            }
        }
    }

    return Array.from(seen.values());
};

/**
 * Main function: Map route coordinates to places
 */
export const mapRouteToPlaces = async (
    routeCoordinates: Coordinate[],
    LocationModel: any
): Promise<PlaceInfo[]> => {
    if (routeCoordinates.length < 2) return [];

    // 1. Sample route at intervals
    const sampledPoints = sampleRoutePoints(routeCoordinates);
    console.log(`📍 Sampled ${sampledPoints.length} points from ${routeCoordinates.length} coordinates`);

    // 2. Find places for each sampled point
    const places: PlaceInfo[] = [];
    let accumulatedDistance = 0;

    for (let i = 0; i < sampledPoints.length; i++) {
        const point = sampledPoints[i];

        // Calculate distance along route
        if (i > 0) {
            const prev = sampledPoints[i - 1];
            accumulatedDistance += calculateDistance(prev.lat, prev.lng, point.lat, point.lng);
        }

        // Find place for this point
        const place = await findPlaceForCoordinate(point.lat, point.lng, LocationModel);

        if (place) {
            place.distanceAlongRoute = Math.round(accumulatedDistance * 10) / 10;
            places.push(place);
        }

        // Rate limiting for external APIs
        if (i > 0 && i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`🗺️ Found ${places.length} places before deduplication`);

    // 3. Deduplicate
    const uniquePlaces = deduplicatePlaces(places);
    console.log(`✅ Final ${uniquePlaces.length} unique places`);

    return uniquePlaces;
};

/**
 * Get place type icon for display
 */
export const getPlaceIcon = (type: PlaceType): string => {
    const icons: Record<PlaceType, string> = {
        village: '🏘️',
        railway_station: '🚉',
        bus_station: '🚌',
        marketplace: '🏪',
        hospital: '🏥',
        school: '🏫',
        temple: '🛕',
        petrol_station: '⛽',
        bank: '🏦',
        police: '🚔',
        unknown: '📍'
    };
    return icons[type] || '📍';
};
