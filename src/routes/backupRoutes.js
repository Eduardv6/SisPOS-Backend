import { Router } from 'express';
import { exportToExcel, exportTableToExcel, getBackupStats } from '../controllers/backupController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Todas las rutas requieren autenticación y ser administrador
router.use(verifyToken);
router.use(isAdmin);

// GET /api/backup/excel - Exportar TODA la base de datos a Excel
router.get('/excel', exportToExcel);

// GET /api/backup/excel/:tabla - Exportar una tabla específica
// Tablas disponibles: productos, ventas, clientes, inventario, usuarios, proveedores
router.get('/excel/:tabla', exportTableToExcel);

// GET /api/backup/stats - Ver estadísticas sin descargar
router.get('/stats', getBackupStats);

export default router;
