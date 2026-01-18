import express from 'express';
const router = express.Router();
import * as sesionCajaController from '../controllers/sesionCajaController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

router.post('/abrir', verifyToken, sesionCajaController.abrirCaja);
router.post('/cerrar', verifyToken, sesionCajaController.cerrarCaja);
router.get('/caja/:cajaId/activa', verifyToken, sesionCajaController.getSesionActiva);
router.post('/movimiento', verifyToken, sesionCajaController.registrarMovimiento);
router.get('/:sesionId/movimientos', verifyToken, sesionCajaController.getMovimientos);

export default router;
