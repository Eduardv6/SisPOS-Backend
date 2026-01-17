import express from 'express';
const router = express.Router();
import * as catalogController from '../controllers/catalogController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

router.get('/brands', verifyToken, catalogController.getBrands);
router.get('/categories', verifyToken, catalogController.getCategories);
router.get('/sizes', verifyToken, catalogController.getSizes);
router.get('/colors', verifyToken, catalogController.getColors);

export default router;