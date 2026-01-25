import express from 'express';
const router = express.Router();
import * as dashboardController from '../controllers/dashboardController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

// GET /api/dashboard/stats - Obtener estadísticas del dashboard
router.get('/stats', verifyToken, dashboardController.getStats);

export default router;
