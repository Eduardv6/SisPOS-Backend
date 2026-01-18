import express from 'express';
const router = express.Router();
import * as almacenController from '../controllers/almacenController.js';
import { verifyToken, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

// Almacenes
router.get('/', verifyToken, almacenController.getAlmacenes);
router.post('/', verifyToken, isSupervisorOrAdmin, almacenController.createAlmacen);
router.put('/:id', verifyToken, isSupervisorOrAdmin, almacenController.updateAlmacen);
router.delete('/:id', verifyToken, isSupervisorOrAdmin, almacenController.deleteAlmacen);

// Inventario
router.get('/:almacenId/inventario', verifyToken, almacenController.getInventarioByAlmacen);
router.post('/inventario', verifyToken, isSupervisorOrAdmin, almacenController.updateStock);
router.patch('/inventario/ajuste', verifyToken, isSupervisorOrAdmin, almacenController.ajustarStock);
router.get('/producto/:productoId/stock', verifyToken, almacenController.getStockByProducto);

export default router;
