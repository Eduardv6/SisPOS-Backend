import express from 'express';
const router = express.Router();
import * as movimientoCajaController from '../controllers/movimientoCajaController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

// GET /api/movimientos-caja - Obtener todos los movimientos con filtros
router.get('/', verifyToken, movimientoCajaController.getMovimientosCaja);

export default router;
