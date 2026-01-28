import express from 'express';
const router = express.Router();
import * as reporteController from '../controllers/reporteController.js';
import { verifyToken, isSupervisorOrAdmin, isAdmin } from '../middlewares/authMiddleware.js';

// Todos los reportes requieren ser Supervisor o Admin
router.get('/ventas-periodo', verifyToken, isSupervisorOrAdmin, reporteController.getVentasPorPeriodo);
router.get('/ganancia-real', verifyToken, isAdmin, reporteController.getGananciaReal); // Solo admin ve utilidad real
router.get('/metodo-pago', verifyToken, isSupervisorOrAdmin, reporteController.getVentasPorMetodoPago);

// Reportes de Inventario
router.get('/inventario-valorado', verifyToken, isAdmin, reporteController.getInventarioValorado); // Solo admin ve montos de costo
router.get('/rotacion-inventario', verifyToken, isSupervisorOrAdmin, reporteController.getProductosSinMovimiento);
router.get('/kardex/:id', verifyToken, isSupervisorOrAdmin, reporteController.getKardexProducto);

// Reportes BI
router.get('/bi/categorias', verifyToken, isSupervisorOrAdmin, reporteController.getTopVentasCategorias);
router.get('/bi/tallas', verifyToken, isSupervisorOrAdmin, reporteController.getAnalisisTallas);

// Reporte de Cajas
router.get('/cajas-sesiones', verifyToken, isSupervisorOrAdmin, reporteController.getReporteCajas);

export default router;
