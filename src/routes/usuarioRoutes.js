import express from 'express';
const router = express.Router();
import * as usuarioController from '../controllers/usuarioController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, isAdmin, usuarioController.getUsuarios);
router.get('/:id', verifyToken, isAdmin, usuarioController.getUsuarioById);
router.post('/', verifyToken, isAdmin, usuarioController.createUsuario);
router.put('/:id', verifyToken, isAdmin, usuarioController.updateUsuario);
router.delete('/:id', verifyToken, isAdmin, usuarioController.deleteUsuario);

export default router;
