import express from 'express';
const router = express.Router();
import * as productoController from '../controllers/productoController.js';
import { verifyToken, isAdmin, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, productoController.getProductos);
router.get('/barcode/:codigo', verifyToken, productoController.getProductoByBarcode);
router.get('/:id', verifyToken, productoController.getProductoById);
// Usar upload.single('imagen') para manejar subida de archivo
router.post('/', verifyToken, isSupervisorOrAdmin, productoController.upload.single('imagen'), productoController.createProducto);
router.put('/:id', verifyToken, isSupervisorOrAdmin, productoController.upload.single('imagen'), productoController.updateProducto);
router.delete('/:id', verifyToken, isAdmin, productoController.deleteProducto);

export default router;
