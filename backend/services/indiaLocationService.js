/**
 * India Location Hub Service
 * Integrates with India Location Hub API to provide comprehensive
 * location data for all 500,000+ villages, districts, tehsils across India
 */

import fetch from 'node-fetch';

// --- API CONFIGURATION ---
const INDIA_LOCATION_HUB_BASE = 'https://api.india-location-hub.in/v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache (use Redis in production for persistence)
const locationCache = new Map();

// --- TYPES ---

/**
 * @typedef {Object} IndiaLocation
 * @property {string} id - Unique identifier
 * @property {string} name - Location name in English
 * @property {string} nameHindi - Location name in Hindi
 * @property {'STATE'|'DISTRICT'|'TEHSIL'|'BLOCK'|'VILLAGE'|'CITY'|'TOWN'} type
 * @property {string} parentId - Parent location ID
 * @property {string} stateCode - 2-letter state code
 * @property {string} districtCode - District code
 * @property {string} pincode - 6-digit pincode
 * @property {{lat: number, lng: number}} coordinates
 * @property {number} population - Approximate population
 * @property {string[]} facilities - Available facilities
 */

/**
 * @typedef {Object} PlaceOfInterest
 * @property {string} id
 * @property {string} name
 * @property {'RAILWAY_STATION'|'BUS_STAND'|'HOSPITAL'|'SCHOOL'|'TEMPLE'|'COURT'|'BLOCK_OFFICE'|'POST_OFFICE'|'BANK'|'PETROL_PUMP'} type
 * @property {{lat: number, lng: number}} coordinates
 * @property {string} villageId - Associated village
 * @property {string} districtId - Associated district
 */

// --- STATE DATA (Hardcoded for offline fallback) ---
const INDIA_STATES = [
    { code: 'AN', name: 'Andaman and Nicobar Islands', nameHindi: 'अंडमान और निकोबार द्वीपसमूह' },
    { code: 'AP', name: 'Andhra Pradesh', nameHindi: 'आंध्र प्रदेश' },
    { code: 'AR', name: 'Arunachal Pradesh', nameHindi: 'अरुणाचल प्रदेश' },
    { code: 'AS', name: 'Assam', nameHindi: 'असम' },
    { code: 'BR', name: 'Bihar', nameHindi: 'बिहार' },
    { code: 'CH', name: 'Chandigarh', nameHindi: 'चंडीगढ़' },
    { code: 'CT', name: 'Chhattisgarh', nameHindi: 'छत्तीसगढ़' },
    { code: 'DL', name: 'Delhi', nameHindi: 'दिल्ली' },
    { code: 'GA', name: 'Goa', nameHindi: 'गोआ' },
    { code: 'GJ', name: 'Gujarat', nameHindi: 'गुजरात' },
    { code: 'HR', name: 'Haryana', nameHindi: 'हरियाणा' },
    { code: 'HP', name: 'Himachal Pradesh', nameHindi: 'हिमाचल प्रदेश' },
    { code: 'JK', name: 'Jammu and Kashmir', nameHindi: 'जम्मू और कश्मीर' },
    { code: 'JH', name: 'Jharkhand', nameHindi: 'झारखंड' },
    { code: 'KA', name: 'Karnataka', nameHindi: 'कर्नाटक' },
    { code: 'KL', name: 'Kerala', nameHindi: 'केरल' },
    { code: 'LA', name: 'Ladakh', nameHindi: 'लद्दाख' },
    { code: 'LD', name: 'Lakshadweep', nameHindi: 'लक्षद्वीप' },
    { code: 'MP', name: 'Madhya Pradesh', nameHindi: 'मध्य प्रदेश' },
    { code: 'MH', name: 'Maharashtra', nameHindi: 'महाराष्ट्र' },
    { code: 'MN', name: 'Manipur', nameHindi: 'मणिपुर' },
    { code: 'ML', name: 'Meghalaya', nameHindi: 'मेघालय' },
    { code: 'MZ', name: 'Mizoram', nameHindi: 'मिज़ोरम' },
    { code: 'NL', name: 'Nagaland', nameHindi: 'नागालैंड' },
    { code: 'OR', name: 'Odisha', nameHindi: 'ओडिशा' },
    { code: 'PY', name: 'Puducherry', nameHindi: 'पुडुचेरी' },
    { code: 'PB', name: 'Punjab', nameHindi: 'पंजाब' },
    { code: 'RJ', name: 'Rajasthan', nameHindi: 'राजस्थान' },
    { code: 'SK', name: 'Sikkim', nameHindi: 'सिक्किम' },
    { code: 'TN', name: 'Tamil Nadu', nameHindi: 'तमिलनाडु' },
    { code: 'TS', name: 'Telangana', nameHindi: 'तेलंगाना' },
    { code: 'TR', name: 'Tripura', nameHindi: 'त्रिपुरा' },
    { code: 'UP', name: 'Uttar Pradesh', nameHindi: 'उत्तर प्रदेश' },
    { code: 'UK', name: 'Uttarakhand', nameHindi: 'उत्तराखंड' },
    { code: 'WB', name: 'West Bengal', nameHindi: 'पश्चिम बंगाल' },
];

// --- API HELPERS ---

/**
 * Make API request with caching
 */
const fetchWithCache = async (endpoint, cacheKey) => {
    // Check cache first
    if (locationCache.has(cacheKey)) {
        const cached = locationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
    }

    try {
        const response = await fetch(`${INDIA_LOCATION_HUB_BASE}${endpoint}`, {
            headers: { 'User-Agent': 'VillageLink/2.0' },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Cache the result
        locationCache.set(cacheKey, { data, timestamp: Date.now() });

        return data;
    } catch (error) {
        console.error(`India Location API error for ${endpoint}:`, error.message);
        return null;
    }
};

// --- PUBLIC API ---

/**
 * Get all Indian states and union territories
 */
export const getAllStates = async () => {
    const apiStates = await fetchWithCache('/states', 'all_states');
    return apiStates || INDIA_STATES;
};

/**
 * Get all districts for a state
 * @param {string} stateCode - 2-letter state code (e.g., 'BR' for Bihar)
 */
export const getDistrictsByState = async (stateCode) => {
    const cacheKey = `districts_${stateCode}`;
    const districts = await fetchWithCache(`/states/${stateCode}/districts`, cacheKey);
    return districts || [];
};

/**
 * Get all tehsils/talukas for a district
 * @param {string} districtCode - District code
 */
export const getTehsilsByDistrict = async (districtCode) => {
    const cacheKey = `tehsils_${districtCode}`;
    const tehsils = await fetchWithCache(`/districts/${districtCode}/tehsils`, cacheKey);
    return tehsils || [];
};

/**
 * Get all blocks for a tehsil
 * @param {string} tehsilCode - Tehsil code
 */
export const getBlocksByTehsil = async (tehsilCode) => {
    const cacheKey = `blocks_${tehsilCode}`;
    const blocks = await fetchWithCache(`/tehsils/${tehsilCode}/blocks`, cacheKey);
    return blocks || [];
};

/**
 * Get all villages for a block
 * @param {string} blockCode - Block code
 */
export const getVillagesByBlock = async (blockCode) => {
    const cacheKey = `villages_${blockCode}`;
    const villages = await fetchWithCache(`/blocks/${blockCode}/villages`, cacheKey);
    return villages || [];
};

/**
 * Search locations with fuzzy matching
 * @param {string} query - Search query (supports partial matches)
 * @param {Object} options - Search options
 */
export const searchLocations = async (query, options = {}) => {
    const {
        type = 'any', // 'STATE', 'DISTRICT', 'VILLAGE', 'POI', etc.
        stateCode = null,
        districtCode = null,
        limit = 20,
        includePOI = true
    } = options;

    const params = new URLSearchParams({
        q: query,
        type,
        limit: String(limit),
        include_poi: String(includePOI)
    });

    if (stateCode) params.append('state', stateCode);
    if (districtCode) params.append('district', districtCode);

    const cacheKey = `search_${params.toString()}`;
    const results = await fetchWithCache(`/search?${params}`, cacheKey);

    if (!results) {
        // Fallback to local fuzzy search if API fails
        return fuzzySearchLocal(query, type);
    }

    return results;
};

/**
 * Search points of interest (railway stations, hospitals, schools, etc.)
 * @param {string} query - Search query
 * @param {string} poiType - Type of POI
 */
export const searchPOI = async (query, poiType = 'any') => {
    const params = new URLSearchParams({
        q: query,
        type: poiType,
        limit: '30'
    });

    const cacheKey = `poi_${params.toString()}`;
    return await fetchWithCache(`/poi/search?${params}`, cacheKey) || [];
};

const FALLBACK_NEARBY_LOCATIONS = [
    { id: 'loc_patna', name: 'Patna Central Hub', nameHindi: 'पटना सेंट्रल हब', type: 'CITY', stateCode: 'BR', pincode: '800001', coordinates: { lat: 25.6093, lng: 85.1376 } },
    { id: 'loc_arrah', name: 'Arrah Junction', nameHindi: 'आरा जंक्शन', type: 'CITY', stateCode: 'BR', pincode: '802301', coordinates: { lat: 25.5512, lng: 84.6713 } },
    { id: 'loc_bihta', name: 'Bihta Logistics Park', nameHindi: 'बिहटा लॉजिस्टिक्स पार्क', type: 'TOWN', stateCode: 'BR', pincode: '801103', coordinates: { lat: 25.5600, lng: 84.8700 } },
    { id: 'loc_maner', name: 'Maner Community Hub', nameHindi: 'मनेर कम्युनिटी हब', type: 'TOWN', stateCode: 'BR', pincode: '801108', coordinates: { lat: 25.6500, lng: 84.8800 } },
    { id: 'loc_danapur', name: 'Danapur Cantt', nameHindi: 'दानापुर कैंट', type: 'TOWN', stateCode: 'BR', pincode: '801503', coordinates: { lat: 25.6200, lng: 85.0400 } },
];

export const getFallbackNearbyLocations = () => FALLBACK_NEARBY_LOCATIONS;

/**
 * Get nearby locations based on coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in kilometers
 */
export const getNearbyLocations = async (lat, lng, radiusKm = 10) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
        return FALLBACK_NEARBY_LOCATIONS;
    }

    const params = new URLSearchParams({
        lat: String(parsedLat),
        lng: String(parsedLng),
        radius: String(radiusKm * 1000) // Convert to meters
    });

    const cacheKey = `nearby_${parsedLat.toFixed(3)}_${parsedLng.toFixed(3)}_${radiusKm}`;
    const result = await fetchWithCache(`/nearby?${params}`, cacheKey);
    if (result && Array.isArray(result) && result.length > 0) {
        return result;
    }
    return FALLBACK_NEARBY_LOCATIONS;
};

/**
 * Get location details by ID
 * @param {string} locationId - Location ID
 */
export const getLocationById = async (locationId) => {
    const cacheKey = `location_${locationId}`;
    return await fetchWithCache(`/locations/${locationId}`, cacheKey);
};

/**
 * Get location hierarchy (breadcrumb path)
 * @param {string} locationId - Location ID
 * @returns {Array} Array of parent locations from state to village
 */
export const getLocationHierarchy = async (locationId) => {
    const cacheKey = `hierarchy_${locationId}`;
    return await fetchWithCache(`/locations/${locationId}/hierarchy`, cacheKey) || [];
};

/**
 * Reverse geocode: Get location from coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export const reverseGeocode = async (lat, lng) => {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng)
    });

    const cacheKey = `reverse_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const result = await fetchWithCache(`/reverse?${params}`, cacheKey);

    if (!result) {
        // Fallback to Nominatim
        return await nominatimFallback(lat, lng);
    }

    return result;
};

// --- FALLBACK FUNCTIONS ---

/**
 * Local fuzzy search fallback when API is unavailable
 */
const fuzzySearchLocal = async (query, type) => {
    const lowerQuery = query.toLowerCase();

    // Search in cached data first
    const results = [];

    for (const [key, value] of locationCache.entries()) {
        if (Array.isArray(value.data)) {
            for (const item of value.data) {
                if (item.name?.toLowerCase().includes(lowerQuery) ||
                    item.nameHindi?.includes(query)) {
                    if (type === 'any' || item.type === type) {
                        results.push(item);
                    }
                }
            }
        }
    }

    // Search in hardcoded states
    for (const state of INDIA_STATES) {
        if (state.name.toLowerCase().includes(lowerQuery) ||
            state.nameHindi.includes(query)) {
            results.push({
                id: state.code,
                name: state.name,
                nameHindi: state.nameHindi,
                type: 'STATE'
            });
        }
    }

    return results.slice(0, 20);
};

/**
 * Nominatim fallback for reverse geocoding
 */
const nominatimFallback = async (lat, lng) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { 'User-Agent': 'VillageLink/2.0' } }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const address = data.address || {};

        return {
            name: address.village || address.town || address.city || address.suburb || 'Unknown',
            type: address.village ? 'VILLAGE' : address.town ? 'TOWN' : 'CITY',
            district: address.county || address.state_district,
            state: address.state,
            pincode: address.postcode,
            coordinates: { lat, lng }
        };
    } catch (error) {
        console.error('Nominatim fallback failed:', error.message);
        return null;
    }
};

// --- POI CATEGORIES ---

export const POI_CATEGORIES = {
    TRANSPORT: {
        icon: '🚉',
        label: 'Transport',
        types: ['RAILWAY_STATION', 'BUS_STAND', 'METRO_STATION', 'AIRPORT']
    },
    HEALTHCARE: {
        icon: '🏥',
        label: 'Healthcare',
        types: ['HOSPITAL', 'PHC', 'CHC', 'CLINIC', 'PHARMACY']
    },
    EDUCATION: {
        icon: '🏫',
        label: 'Education',
        types: ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'COACHING']
    },
    GOVERNMENT: {
        icon: '🏛️',
        label: 'Government',
        types: ['BLOCK_OFFICE', 'TEHSIL_OFFICE', 'DISTRICT_OFFICE', 'COURT', 'POLICE_STATION']
    },
    RELIGIOUS: {
        icon: '🛕',
        label: 'Religious',
        types: ['TEMPLE', 'MOSQUE', 'CHURCH', 'GURUDWARA']
    },
    FINANCE: {
        icon: '🏦',
        label: 'Finance',
        types: ['BANK', 'ATM', 'POST_OFFICE']
    },
    UTILITIES: {
        icon: '⛽',
        label: 'Utilities',
        types: ['PETROL_PUMP', 'GAS_AGENCY', 'WATER_TANK']
    },
    COMMERCE: {
        icon: '🏪',
        label: 'Markets',
        types: ['MARKET', 'MANDI', 'SHOPPING_CENTER']
    }
};

/**
 * Get POI by category
 * @param {string} category - Category from POI_CATEGORIES
 * @param {string} districtCode - District to search in
 */
export const getPOIByCategory = async (category, districtCode) => {
    const categoryInfo = POI_CATEGORIES[category];
    if (!categoryInfo) return [];

    const results = [];
    for (const type of categoryInfo.types) {
        const pois = await searchPOI('', type);
        results.push(...pois.filter(p => !districtCode || p.districtCode === districtCode));
    }

    return results;
};

// --- CACHE MANAGEMENT ---

/**
 * Clear location cache
 */
export const clearCache = () => {
    locationCache.clear();
    console.log('🗑️ India location cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    let totalItems = 0;
    let expiredItems = 0;
    const now = Date.now();

    for (const [, value] of locationCache.entries()) {
        totalItems++;
        if (now - value.timestamp > CACHE_TTL_MS) {
            expiredItems++;
        }
    }

    return {
        totalItems,
        expiredItems,
        validItems: totalItems - expiredItems,
        cacheTTLDays: CACHE_TTL_MS / (24 * 60 * 60 * 1000)
    };
};

export default {
    getAllStates,
    getDistrictsByState,
    getTehsilsByDistrict,
    getBlocksByTehsil,
    getVillagesByBlock,
    searchLocations,
    searchPOI,
    getNearbyLocations,
    getLocationById,
    getLocationHierarchy,
    reverseGeocode,
    getPOIByCategory,
    clearCache,
    getCacheStats,
    POI_CATEGORIES,
    INDIA_STATES
};
