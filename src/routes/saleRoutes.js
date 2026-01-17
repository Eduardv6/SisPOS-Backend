import express from 'express';
const router = express.Router();
import * as saleController from '../controllers/saleController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

router.post('/', verifyToken, saleController.createSale);

export default router;