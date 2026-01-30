import express from 'express';
const router = express.Router();
import * as dashboardController from '../controllers/dashboardController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

router.get('/stats', verifyToken, dashboardController.getStats);

export default router;
