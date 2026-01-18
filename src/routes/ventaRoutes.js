import express from 'express';
const router = express.Router();
import * as ventaController from '../controllers/ventaController.js';
import { verifyToken, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, ventaController.getVentas);
router.get('/:id', verifyToken, ventaController.getVentaById);
router.post('/', verifyToken, ventaController.createVenta);
router.put('/:id/anular', verifyToken, isSupervisorOrAdmin, ventaController.anularVenta);

export default router;
