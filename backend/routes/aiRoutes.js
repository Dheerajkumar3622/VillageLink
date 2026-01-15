
import express from 'express';
import { chatWithSarpanch, diagnoseLeaf, estimateParcel, verifyBiometrics } from '../controllers/aiController.js';
import { authenticate } from '../auth.js';

const router = express.Router();

// Public chatbot (or protected, depending on preference)
router.post('/chat', chatWithSarpanch);

// Protected Features
router.post('/diagnose', authenticate, diagnoseLeaf);
router.post('/parcel-scan', authenticate, estimateParcel);
router.post('/verify-bio', authenticate, verifyBiometrics);

export default router;
