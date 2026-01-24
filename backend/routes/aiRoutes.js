import express from 'express';
import { chatWithGramSahayak, getGramInsights, diagnoseLeaf, estimateParcel, verifyBiometrics, analyzeHygiene } from '../controllers/aiController.js';
import { authenticate } from '../auth.js';

// Routes for AI features
const router = express.Router();

// Gram Sahayak Chatbot
router.post('/chat', chatWithGramSahayak);

// AI Dashboard Insights
router.get('/insights', getGramInsights);

// Protected Features
router.post('/diagnose', authenticate, diagnoseLeaf);
router.post('/parcel-scan', authenticate, estimateParcel);
router.post('/verify-bio', authenticate, verifyBiometrics);
router.post('/hygiene-audit', authenticate, analyzeHygiene);

export default router;
