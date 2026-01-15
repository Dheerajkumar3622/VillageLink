
import express from 'express';
import { searchVillages, getSampleLocations, getNearestVillage } from '../controllers/villageController.js';

const router = express.Router();

// Define routes for /api/locations
router.get('/search', searchVillages); // GET /api/locations/search?q=...
router.get('/nearest', getNearestVillage); // GET /api/locations/nearest?lat=...&lng=...
router.get('/', getSampleLocations);   // GET /api/locations (restricted list)

export default router;
