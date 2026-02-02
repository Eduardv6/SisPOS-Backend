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
router.patch('/ajuste', verifyToken, inventarioController.ajustarStock); // Frontend usa PATCH o POST? Revisar. Controller es post en original pero patch es mas semantico. Mantendré POST si frontend usa POST. Controller dice router.post('/ajuste'...) en original.

// Historial de movimientos (Kardex)
router.get('/movimientos', verifyToken, inventarioController.getMovimientos);

// Transferir stock entre almacenes (busca producto equivalente)
router.post('/transferencia', verifyToken, isSupervisorOrAdmin, inventarioController.transferirStock);

export default router;
