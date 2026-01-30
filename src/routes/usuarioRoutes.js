import express from 'express';
const router = express.Router();
import * as usuarioController from '../controllers/usuarioController.js';
import { verifyToken, isAdmin, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, isSupervisorOrAdmin, usuarioController.getUsuarios);
router.get('/:id', verifyToken, isSupervisorOrAdmin, usuarioController.getUsuarioById);
router.post('/', verifyToken, isSupervisorOrAdmin, usuarioController.createUsuario);
router.put('/:id', verifyToken, isSupervisorOrAdmin, usuarioController.updateUsuario); // Supervisors can update users
router.delete('/:id', verifyToken, isAdmin, usuarioController.deleteUsuario); // Admin only for delete

export default router;
