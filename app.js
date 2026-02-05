import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/authRoutes.js';
import categoriaRoutes from './src/routes/categoriaRoutes.js';
import sucursalRoutes from './src/routes/sucursalRoutes.js';
import movimientoCajaRoutes from './src/routes/movimientoCajaRoutes.js';
import cajaRoutes from './src/routes/cajaRoutes.js';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import productoRoutes from './src/routes/productoRoutes.js';
import clienteRoutes from './src/routes/clienteRoutes.js';
import proveedorRoutes from './src/routes/proveedorRoutes.js';
import almacenRoutes from './src/routes/almacenRoutes.js';
import inventarioRoutes from './src/routes/inventarioRoutes.js';
import sesionCajaRoutes from './src/routes/sesionCajaRoutes.js';
import ventaRoutes from './src/routes/ventaRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import reporteRoutes from './src/routes/reporteRoutes.js';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuraciones de express
const app = express();

// Habilitar CORS para todas las peticiones
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos (imágenes de productos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware para loguear todas las peticiones (DEBUG)
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log('\n====================================');
    console.log(`📥 ${req.method} ${req.originalUrl}`);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('====================================\n');
  }
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/sucursales', sucursalRoutes);
app.use('/api/movimientos-caja', movimientoCajaRoutes);
app.use('/api/cajas', cajaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/almacenes', almacenRoutes);
app.use('/api/inventarios', inventarioRoutes);
app.use('/api/sesion-caja', sesionCajaRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reporteRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});