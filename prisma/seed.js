import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos para Zapatería...\n');

  // 1. Crear Sucursal Principal
  const sucursal = await prisma.sucursal.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Zapatería Telléz',
      direccion: 'Av. Santos Dumont 8vo anillo'
    }
  });
  console.log('🏢 Sucursal creada:', sucursal.nombre);

  // 2. Crear Almacén
  const almacen = await prisma.almacen.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Almacén Principal',
      sucursalId: sucursal.id,
      ubicacion: 'Santos Dumont 8vo anillo'
    }
  });
  console.log('📦 Almacén creado:', almacen.nombre);

  // 3. Crear Cajas
  const cajas = [
    { nombre: 'Caja 1', codigo: 'CAJA-001' },
    { nombre: 'Caja 2', codigo: 'CAJA-002' }
  ];
  for (let i = 0; i < cajas.length; i++) {
    await prisma.caja.upsert({
      where: { id: i + 1 },
      update: {},
      create: { ...cajas[i], sucursalId: sucursal.id, estado: 'LIBRE' }
    });
  }
  console.log('💰 Cajas creadas:', cajas.length);

  // 4. Crear Usuario Administrador
  const passwordHash = await bcrypt.hash('Admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@zapateria.com' },
    update: {},
    create: {
      nombres: 'Administrador',
      email: 'admin@zapateria.com',
      contrasena: passwordHash,
      tipo: 'administrador',
      estado: true,
      sucursalId: sucursal.id
    }
  });
  console.log('👤 Usuario Admin creado:', admin.email);

  // Crear Cajero de ejemplo
  const cajeroHash = await bcrypt.hash('Cajero123', 10);
  await prisma.usuario.upsert({
    where: { email: 'cajero@zapateria.com' },
    update: {},
    create: {
      nombres: 'María García',
      email: 'cajero@zapateria.com',
      contrasena: cajeroHash,
      tipo: 'cajero',
      estado: true,
      sucursalId: sucursal.id
    }
  });
  console.log('👤 Cajero creado: cajero@zapateria.com');

  // 5. Crear Categorías de Zapatería
  const categorias = [
    { nombre: 'Deportivos' },
    { nombre: 'Casual Hombre' },
    { nombre: 'Casual Mujer' },
    { nombre: 'Formal Hombre' },
    { nombre: 'Formal Mujer' },
    { nombre: 'Sneaker' }
  ];

  for (let i = 0; i < categorias.length; i++) {
    await prisma.categoria.upsert({
      where: { id: i + 1 },
      update: {},
      create: categorias[i]
    });
  }
  console.log('📂 Categorías creadas:', categorias.length);

  // 6. Crear Productos de Zapatería con Sucursal y Almacén
  const productos = [
    // Deportivos
    { nombre: 'Nike Air Max 270', categoriaId: 1, talla: '38', color: 'Amarillo', precioCompra: 450, precioVenta: 699, codigoBarras: 'NIK-AM270-001' },
    { nombre: 'Adidas Ultraboost 22', categoriaId: 1, talla: '41', color: 'Naranja', precioCompra: 520, precioVenta: 799, codigoBarras: 'ADI-UB22-001' },
    { nombre: 'Puma RS-X', categoriaId: 1, talla: '43', color: 'Blanco', precioCompra: 320, precioVenta: 499, codigoBarras: 'PUM-RSX-001' },
    { nombre: 'New Balance 574', categoriaId: 1, talla: '42', color: 'Verde', precioCompra: 380, precioVenta: 599, codigoBarras: 'NB-574-001' },
    
    // Casual Hombre
    { nombre: 'Mocasín Cuero Negro', categoriaId: 2, talla: '40', color: 'Negro', precioCompra: 180, precioVenta: 299, codigoBarras: 'MOC-CN-001' },
    { nombre: 'Zapatilla Canvas Blanca', categoriaId: 2, talla: '43', color: 'Azul', precioCompra: 120, precioVenta: 199, codigoBarras: 'CNV-BL-001' },
    { nombre: 'Slip-On Casual', categoriaId: 2, talla: '41', color: 'Gris', precioCompra: 150, precioVenta: 249, codigoBarras: 'SLP-CS-001' },
    
    // Casual Mujer
    { nombre: 'Ballerina Rosa', categoriaId: 3, talla: '36', color: 'Morado', precioCompra: 100, precioVenta: 179, codigoBarras: 'BAL-RS-001' },
    { nombre: 'Sneaker Plataforma Blanco', categoriaId: 3, talla: '37', color: 'Rosa', precioCompra: 200, precioVenta: 329, codigoBarras: 'SNK-PL-001' },
    { nombre: 'Loafer Beige', categoriaId: 3, talla: '38', color: 'Beige', precioCompra: 160, precioVenta: 269, codigoBarras: 'LOA-BG-001' },
    
    // Formal Hombre
    { nombre: 'Oxford Negro Cuero', categoriaId: 4, talla: '42', color: 'Negro', precioCompra: 280, precioVenta: 449, codigoBarras: 'OXF-NG-001' },
    { nombre: 'Derby Marrón', categoriaId: 4, talla: '44', color: 'Marrón', precioCompra: 260, precioVenta: 399, codigoBarras: 'DRB-MR-001' },
    { nombre: 'Monk Strap Negro', categoriaId: 4, talla: '43', color: 'Negro', precioCompra: 300, precioVenta: 479, codigoBarras: 'MNK-NG-001' },
    
    // Formal Mujer
    { nombre: 'Tacón Stiletto Negro 10cm', categoriaId: 5, talla: '35', color: 'Negro', precioCompra: 220, precioVenta: 359, codigoBarras: 'STL-NG-001' },
    { nombre: 'Tacón Block Nude', categoriaId: 5, talla: '37', color: 'Blanco', precioCompra: 180, precioVenta: 299, codigoBarras: 'TBL-ND-001' },
    { nombre: 'Pump Clásico Rojo', categoriaId: 5, talla: '36', color: 'Rojo', precioCompra: 200, precioVenta: 329, codigoBarras: 'PMP-RJ-001' },
    
    // Sneaker
    { nombre: 'Nike Air Force 1', categoriaId: 6, talla: '40', color: 'Blanco', precioCompra: 350, precioVenta: 490, codigoBarras: 'NIK-WHT-001' },
    { nombre: 'Adidas Stan Smith', categoriaId: 6, talla: '42', color: 'Negro', precioCompra: 450, precioVenta: 619, codigoBarras: 'ADI-BLK-001' },
    { nombre: 'Nike Air Jordan 1', categoriaId: 6, talla: '41', color: 'Verde', precioCompra: 215, precioVenta: 350, codigoBarras: 'NIK-JGN-001' },
    { nombre: 'Adidas Yeezy Boost 350', categoriaId: 6, talla: '44', color: 'Beige', precioCompra: 355, precioVenta: 469, codigoBarras: 'ADI-BEG-001' },
    { nombre: 'New Balance 550', categoriaId: 6, talla: '40', color: 'Gris', precioCompra: 315, precioVenta: 445, codigoBarras: 'NEW-GRY-001' },
    { nombre: 'Nike SB Panda', categoriaId: 6, talla: '42', color: 'Negro', precioCompra: 355, precioVenta: 455, codigoBarras: 'NIK-SBL-001' },
    { nombre: 'Pumas Caven BMW ', categoriaId: 6, talla: '40', color: 'Blanco', precioCompra: 265, precioVenta: 305, codigoBarras: 'PUM-CWH-001' }
  ];

  for (const prod of productos) {
    const stockInicial = Math.floor(Math.random() * 40) + 10;
    const producto = await prisma.producto.upsert({
      where: { codigoBarras: prod.codigoBarras },
      update: {},
      create: { 
        ...prod, 
        sucursalId: sucursal.id,
        almacenId: almacen.id,
        stock: stockInicial,
        stockMinimo: 5
      }
    });

    // Crear inventario inicial con el mismo stock
    await prisma.inventario.upsert({
      where: {
        unique_stock: {
          productoId: producto.id,
          almacenId: almacen.id
        }
      },
      update: {},
      create: {
        productoId: producto.id,
        almacenId: almacen.id,
        cantidad: stockInicial
      }
    });

    // Registrar movimiento de INVENTARIO INICIAL
    await prisma.movimientoInventario.create({
      data: {
        productoId: producto.id,
        almacenId: almacen.id,
        tipo: 'ENTRADA',
        cantidad: stockInicial,
        motivo: 'Inventario Inicial (Seed)',
        usuarioId: admin.id
      }
    });
  }

  // 7. Crear Proveedores
  const proveedores = [
    { nombre: 'Sporting BR', direccion: 'Zona Sur, La Paz', celular: '71234567', contacto: 'Carlos Mendez' },
    { nombre: 'Adidas Distribuidora', direccion: 'Av. América, Cochabamba', celular: '72345678', contacto: 'Ana Rojas' },
    { nombre: 'Importadora Calzados SA', direccion: 'Zona Industrial, Santa Cruz', celular: '73456789', contacto: 'Pedro Gutierrez' },
    { nombre: 'Manaco', direccion: 'Calle Comercio, Oruro', celular: '74567890', contacto: 'María López' }
  ];

  for (const prov of proveedores) {
    await prisma.proveedor.upsert({
      where: { id: proveedores.indexOf(prov) + 1 },
      update: {},
      create: prov
    });
  }

  // 8. Crear Clientes frecuentes
  const clientes = [
    { nombre: 'Juan Pérez', email: 'juan.perez@email.com', celular: '76543210', direccion: 'Calle 1 #123' },
    { nombre: 'Ana María Rodríguez', email: 'ana.rodriguez@email.com', celular: '76543211', direccion: 'Av. Principal #456' },
    { nombre: 'Carlos Mamani', email: 'carlos.m@email.com', celular: '76543212', direccion: 'Zona Norte #789' }
  ];

  for (const cli of clientes) {
    await prisma.cliente.upsert({
      where: { id: clientes.indexOf(cli) + 1 },
      update: {},
      create: cli
    });
  }
  console.log('\n✅ Base de datos de Zapatería poblada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });