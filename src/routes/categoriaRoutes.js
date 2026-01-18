import express from 'express';
const router = express.Router();
import * as categoriaController from '../controllers/categoriaController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, categoriaController.getCategorias);
router.get('/:id', verifyToken, categoriaController.getCategoriaById);
router.post('/', verifyToken, isAdmin, categoriaController.createCategoria);
router.put('/:id', verifyToken, isAdmin, categoriaController.updateCategoria);
router.delete('/:id', verifyToken, isAdmin, categoriaController.deleteCategoria);

export default router;
