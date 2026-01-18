import express from 'express';
const router = express.Router();
import * as inventarioController from '../controllers/inventarioController.js';
import { verifyToken, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

// Obtener inventario de un almacén específico
router.get('/almacen/:almacenId', verifyToken, inventarioController.getInventarioByAlmacen);

// Ver stock de un producto en todos los almacenes
router.get('/producto/:productoId', verifyToken, inventarioController.getStockByProducto);

// Actualizar stock (Setear cantidad exacta)
router.post('/', verifyToken, isSupervisorOrAdmin, inventarioController.updateStock);

// Ajustar stock (Incrementar/Decrementar)
router.patch('/ajuste', verifyToken, isSupervisorOrAdmin, inventarioController.ajustarStock);

// Historial de movimientos (Kardex)
router.get('/movimientos', verifyToken, inventarioController.getMovimientos);

export default router;
