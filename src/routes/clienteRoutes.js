import express from 'express';
const router = express.Router();
import * as clienteController from '../controllers/clienteController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

router.get('/', verifyToken, clienteController.getClientes);
router.get('/:id', verifyToken, clienteController.getClienteById);
router.post('/', verifyToken, clienteController.createCliente);
router.put('/:id', verifyToken, clienteController.updateCliente);
router.delete('/:id', verifyToken, clienteController.deleteCliente);

export default router;
