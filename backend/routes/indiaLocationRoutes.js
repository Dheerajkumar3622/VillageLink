/**
 * India Location Routes
 * API endpoints for comprehensive location search across India
 * Integrates with India Location Hub API
 */

import express from 'express';
import * as IndiaLocation from '../services/indiaLocationService.js';

const router = express.Router();

/**
 * GET /api/india/states
 * Get all Indian states and union territories
 */
router.get('/states', async (req, res) => {
    try {
        const states = await IndiaLocation.getAllStates();
        res.json({ success: true, data: states, count: states.length });
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch states' });
    }
});

/**
 * GET /api/india/states/:stateCode/districts
 * Get all districts for a state
 */
router.get('/states/:stateCode/districts', async (req, res) => {
    try {
        const { stateCode } = req.params;
        const districts = await IndiaLocation.getDistrictsByState(stateCode.toUpperCase());
        res.json({ success: true, data: districts, count: districts.length });
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch districts' });
    }
});

/**
 * GET /api/india/districts/:districtCode/tehsils
 * Get all tehsils/talukas for a district
 */
router.get('/districts/:districtCode/tehsils', async (req, res) => {
    try {
        const { districtCode } = req.params;
        const tehsils = await IndiaLocation.getTehsilsByDistrict(districtCode);
        res.json({ success: true, data: tehsils, count: tehsils.length });
    } catch (error) {
        console.error('Error fetching tehsils:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tehsils' });
    }
});

/**
 * GET /api/india/tehsils/:tehsilCode/blocks
 * Get all blocks for a tehsil
 */
router.get('/tehsils/:tehsilCode/blocks', async (req, res) => {
    try {
        const { tehsilCode } = req.params;
        const blocks = await IndiaLocation.getBlocksByTehsil(tehsilCode);
        res.json({ success: true, data: blocks, count: blocks.length });
    } catch (error) {
        console.error('Error fetching blocks:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch blocks' });
    }
});

/**
 * GET /api/india/blocks/:blockCode/villages
 * Get all villages for a block
 */
router.get('/blocks/:blockCode/villages', async (req, res) => {
    try {
        const { blockCode } = req.params;
        const villages = await IndiaLocation.getVillagesByBlock(blockCode);
        res.json({ success: true, data: villages, count: villages.length });
    } catch (error) {
        console.error('Error fetching villages:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch villages' });
    }
});

/**
 * GET /api/india/search
 * Smart search across all locations
 * Query params: q, type, state, district, limit
 */
router.get('/search', async (req, res) => {
    try {
        const { q, type, state, district, limit = 20 } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, data: [], message: 'Query too short' });
        }

        const results = await IndiaLocation.searchLocations(q, {
            type: type || 'any',
            stateCode: state,
            districtCode: district,
            limit: parseInt(limit),
            includePOI: true
        });

        res.json({
            success: true,
            data: results,
            count: results.length,
            query: q
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

/**
 * GET /api/india/poi/search
 * Search points of interest
 * Query params: q, type
 */
router.get('/poi/search', async (req, res) => {
    try {
        const { q = '', type = 'any' } = req.query;
        const results = await IndiaLocation.searchPOI(q, type);
        res.json({ success: true, data: results, count: results.length });
    } catch (error) {
        console.error('POI search error:', error);
        res.status(500).json({ success: false, error: 'POI search failed' });
    }
});

/**
 * GET /api/india/poi/categories
 * Get all POI categories with icons
 */
router.get('/poi/categories', (req, res) => {
    res.json({
        success: true,
        data: IndiaLocation.POI_CATEGORIES
    });
});

/**
 * GET /api/india/poi/category/:category
 * Get POIs by category
 * Query params: district
 */
router.get('/poi/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { district } = req.query;
        const results = await IndiaLocation.getPOIByCategory(category.toUpperCase(), district);
        res.json({ success: true, data: results, count: results.length });
    } catch (error) {
        console.error('POI category error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch POIs' });
    }
});

/**
 * GET /api/india/nearby
 * Get nearby locations based on coordinates
 * Query params: lat, lng, radius (km)
 */
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 10 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'lat and lng required' });
        }

        const results = await IndiaLocation.getNearbyLocations(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(radius)
        );

        res.json({ success: true, data: results, count: results.length });
    } catch (error) {
        console.error('Nearby search error:', error);
        res.status(500).json({ success: false, error: 'Nearby search failed' });
    }
});

/**
 * GET /api/india/reverse
 * Reverse geocode coordinates to location
 * Query params: lat, lng
 */
router.get('/reverse', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'lat and lng required' });
        }

        const result = await IndiaLocation.reverseGeocode(
            parseFloat(lat),
            parseFloat(lng)
        );

        if (!result) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Reverse geocode error:', error);
        res.status(500).json({ success: false, error: 'Reverse geocode failed' });
    }
});

/**
 * GET /api/india/geocode
 * Proxy geocode query to Google Maps from backend (server-side bypasses browser HTTP referrer/IP restrictions)
 */
router.get('/geocode', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ success: false, error: 'address query parameter required' });
        }

        const apiKey = "AIzaSyChdzuy7TWgVVH4GboCc39bZb6oLw7bins";
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Geocoding API returned status ${response.status}`);
        }

        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Backend geocode proxy error:', error);
        res.status(500).json({ success: false, error: 'Geocoding failed' });
    }
});

/**
 * GET /api/india/distance
 * Proxy Distance Matrix query to Google Maps from backend (server-side bypasses browser HTTP referrer/IP restrictions)
 */
router.get('/distance', async (req, res) => {
    try {
        const { origins, destinations } = req.query;
        if (!origins || !destinations) {
            return res.status(400).json({ success: false, error: 'origins and destinations required' });
        }

        const apiKey = "AIzaSyChdzuy7TWgVVH4GboCc39bZb6oLw7bins";
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Distance Matrix API returned status ${response.status}`);
        }

        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Backend distance proxy error:', error);
        res.status(500).json({ success: false, error: 'Distance calculation failed' });
    }
});

/**
 * GET /api/india/location/:id
 * Get location details by ID
 */
router.get('/location/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const location = await IndiaLocation.getLocationById(id);

        if (!location) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }

        res.json({ success: true, data: location });
    } catch (error) {
        console.error('Location fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch location' });
    }
});

/**
 * GET /api/india/location/:id/hierarchy
 * Get location hierarchy (breadcrumb)
 */
router.get('/location/:id/hierarchy', async (req, res) => {
    try {
        const { id } = req.params;
        const hierarchy = await IndiaLocation.getLocationHierarchy(id);
        res.json({ success: true, data: hierarchy });
    } catch (error) {
        console.error('Hierarchy fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch hierarchy' });
    }
});

/**
 * GET /api/india/places/autocomplete
 * Proxy Places Autocomplete queries to Google Maps Places API from backend
 */
router.get('/places/autocomplete', async (req, res) => {
    try {
        const { input } = req.query;
        if (!input) {
            return res.status(400).json({ success: false, error: 'input query parameter required' });
        }
        const apiKey = "AIzaSyChdzuy7TWgVVH4GboCc39bZb6oLw7bins";
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Places Autocomplete API returned status ${response.status}`);
        }
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Backend autocomplete proxy error:', error);
        res.status(500).json({ success: false, error: error.message || 'Autocomplete failed' });
    }
});

/**
 * GET /api/india/places/details
 * Proxy Place Details queries to Google Maps Places API from backend
 */
router.get('/places/details', async (req, res) => {
    try {
        const { placeId } = req.query;
        if (!placeId) {
            return res.status(400).json({ success: false, error: 'placeId query parameter required' });
        }
        const apiKey = "AIzaSyChdzuy7TWgVVH4GboCc39bZb6oLw7bins";
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,address_components&key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Place Details API returned status ${response.status}`);
        }
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Backend place details proxy error:', error);
        res.status(500).json({ success: false, error: error.message || 'Details failed' });
    }
});

/**
 * GET /api/india/reverse-geocode
 * Proxy Google Reverse Geocoding from backend
 */
router.get('/reverse-geocode', async (req, res) => {
    try {
        const { lat, lng, result_type } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'lat and lng parameters required' });
        }
        const apiKey = "AIzaSyChdzuy7TWgVVH4GboCc39bZb6oLw7bins";
        let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        if (result_type) {
            url += `&result_type=${encodeURIComponent(result_type)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Reverse Geocoding API returned status ${response.status}`);
        }
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Backend reverse-geocode proxy error:', error);
        res.status(500).json({ success: false, error: error.message || 'Reverse geocoding failed' });
    }
});

export default router;

