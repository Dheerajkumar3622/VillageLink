import express from 'express';
import { getNearbySpots, initiateBooking, acceptTour, getPendingTours, cancelTour } from '../controllers/tourismController.js';
import { authenticate } from '../auth.js'; // Adjust based on your auth middleware location

const router = express.Router();

// Public routes
router.get('/nearby', getNearbySpots);

// Protect all routes requiring auth
router.post('/book', authenticate, initiateBooking);
router.post('/accept', authenticate, acceptTour);
router.get('/pending', authenticate, getPendingTours);
router.post('/cancel', authenticate, cancelTour);

export default router;
