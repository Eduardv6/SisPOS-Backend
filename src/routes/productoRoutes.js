import express from 'express';
const router = express.Router();
import * as productoController from '../controllers/productoController.js';
import { verifyToken, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';
import { upload } from '../controllers/productoController.js'; // Importar configuración de multer

router.get('/', verifyToken, productoController.getProductos);
router.get('/barcode/:codigo', verifyToken, productoController.getProductoByBarcode);
router.get('/:id', verifyToken, productoController.getProductoById);

// Rutas de escritura protegidas para Admin y Supervisor
router.post('/', verifyToken, isSupervisorOrAdmin, upload.single('imagen'), productoController.createProducto);
router.put('/:id', verifyToken, isSupervisorOrAdmin, upload.single('imagen'), productoController.updateProducto);
router.delete('/:id', verifyToken, isSupervisorOrAdmin, productoController.deleteProducto);

export default router;
