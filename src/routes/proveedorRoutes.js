import express from 'express';
const router = express.Router();
import * as proveedorController from '../controllers/proveedorController.js';
import { verifyToken, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, proveedorController.getProveedores);
router.get('/:id', verifyToken, proveedorController.getProveedorById);
router.post('/', verifyToken, isSupervisorOrAdmin, proveedorController.createProveedor);
router.put('/:id', verifyToken, isSupervisorOrAdmin, proveedorController.updateProveedor);
router.delete('/:id', verifyToken, isSupervisorOrAdmin, proveedorController.deleteProveedor);

export default router;
