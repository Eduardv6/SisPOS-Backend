import express from 'express';
const router = express.Router();
import * as reporteController from '../controllers/reporteController.js';
import { verifyToken, isSupervisorOrAdmin } from '../middlewares/authMiddleware.js';

// Todos los reportes requieren ser Supervisor o Admin
router.get('/ventas-periodo', verifyToken, reporteController.getVentasPorPeriodo);
router.get('/ganancia-real', verifyToken, reporteController.getGananciaReal);
router.get('/metodo-pago', verifyToken, reporteController.getVentasPorMetodoPago);

// Reportes de Inventario
router.get('/inventario-valorado', verifyToken, reporteController.getInventarioValorado);
router.get('/productos-sin-movimiento', verifyToken, reporteController.getProductosSinMovimiento);
router.get('/kardex/:id', verifyToken, reporteController.getKardexProducto);

// Reportes BI
router.get('/bi/categorias', verifyToken, isSupervisorOrAdmin, reporteController.getTopVentasCategorias);
router.get('/bi/tallas', verifyToken, isSupervisorOrAdmin, reporteController.getAnalisisTallas);

// Reporte de Cajas
router.get('/cajas-sesiones', verifyToken, isSupervisorOrAdmin, reporteController.getReporteCajas);

// Reporte de Clientes
router.get('/clientes', verifyToken, reporteController.getReporteClientes);


export default router;
