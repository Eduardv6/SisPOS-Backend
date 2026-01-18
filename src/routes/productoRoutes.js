import express from 'express';
const router = express.Router();
import * as productoController from '../controllers/productoController.js';
import { verifyToken, isAdmin, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, productoController.getProductos);
router.get('/barcode/:codigo', verifyToken, productoController.getProductoByBarcode);
router.get('/:id', verifyToken, productoController.getProductoById);
router.post('/', verifyToken, isSupervisorOrAdmin, productoController.createProducto);
router.put('/:id', verifyToken, isSupervisorOrAdmin, productoController.updateProducto);
router.delete('/:id', verifyToken, isAdmin, productoController.deleteProducto);

export default router;
