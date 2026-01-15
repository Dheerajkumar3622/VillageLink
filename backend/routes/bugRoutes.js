
import express from 'express';
import { reportBug } from '../controllers/bugController.js';

const router = express.Router();

router.post('/report', reportBug);

export default router;
