import express from 'express';
const router = express.Router();
import * as sucursalController from '../controllers/sucursalController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, sucursalController.getSucursales);
router.get('/:id', verifyToken, sucursalController.getSucursalById);
router.post('/', verifyToken, isAdmin, sucursalController.createSucursal);
router.put('/:id', verifyToken, isAdmin, sucursalController.updateSucursal);
router.delete('/:id', verifyToken, isAdmin, sucursalController.deleteSucursal);

export default router;
