import express from 'express';
const router = express.Router();
import * as cajaController from '../controllers/cajaController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, cajaController.getCajas);
router.get('/:id', verifyToken, cajaController.getCajaById);
router.post('/', verifyToken, isAdmin, cajaController.createCaja);
router.put('/:id', verifyToken, isAdmin, cajaController.updateCaja);
router.delete('/:id', verifyToken, isAdmin, cajaController.deleteCaja);

// Operaciones de caja
router.post('/:id/abrir', verifyToken, cajaController.abrirCaja);
router.post('/:id/cerrar', verifyToken, cajaController.cerrarCajaEndpoint);
router.post('/:id/ingreso', verifyToken, cajaController.registrarIngreso);
router.post('/:id/retiro', verifyToken, cajaController.registrarRetiro);

export default router;
