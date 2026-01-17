import express from 'express';
import productRoutes from './src/routes/productRoutes.js';
import catalogRoutes from './src/routes/catalogRoutes.js';
import saleRoutes from './src/routes/saleRoutes.js';
import authRoutes from './src/routes/authRoutes.js';

//configuraciones de express
const app = express();

// Middleware para parsear JSON
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', catalogRoutes);
app.use('/api/sales', saleRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto http://localhost:${PORT}`);
});