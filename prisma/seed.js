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
      nombre: 'Zapatería Central',
      direccion: 'Av. Principal #456, Centro Comercial'
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
      ubicacion: 'Bodega trasera'
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
    { nombre: 'Sandalias' },
    { nombre: 'Botas' },
    { nombre: 'Niños' },
    { nombre: 'Accesorios' }
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
    { nombre: 'Nike Air Max 270', categoriaId: 1, talla: '38, 39, 40, 41, 42, 43', color: 'Negro, Blanco, Rojo', precioCompra: 450, precioVenta: 699, codigoBarras: 'NIK-AM270-001' },
    { nombre: 'Adidas Ultraboost 22', categoriaId: 1, talla: '38, 39, 40, 41, 42, 43, 44', color: 'Negro, Gris, Azul', precioCompra: 520, precioVenta: 799, codigoBarras: 'ADI-UB22-001' },
    { nombre: 'Puma RS-X', categoriaId: 1, talla: '39, 40, 41, 42, 43', color: 'Blanco, Negro', precioCompra: 320, precioVenta: 499, codigoBarras: 'PUM-RSX-001' },
    { nombre: 'New Balance 574', categoriaId: 1, talla: '38, 39, 40, 41, 42, 43', color: 'Gris, Azul, Verde', precioCompra: 380, precioVenta: 599, codigoBarras: 'NB-574-001' },
    
    // Casual Hombre
    { nombre: 'Mocasín Cuero Negro', categoriaId: 2, talla: '39, 40, 41, 42, 43, 44', color: 'Negro, Marrón', precioCompra: 180, precioVenta: 299, codigoBarras: 'MOC-CN-001' },
    { nombre: 'Zapatilla Canvas Blanca', categoriaId: 2, talla: '38, 39, 40, 41, 42, 43', color: 'Blanco, Negro, Azul', precioCompra: 120, precioVenta: 199, codigoBarras: 'CNV-BL-001' },
    { nombre: 'Slip-On Casual', categoriaId: 2, talla: '39, 40, 41, 42, 43', color: 'Negro, Gris, Beige', precioCompra: 150, precioVenta: 249, codigoBarras: 'SLP-CS-001' },
    
    // Casual Mujer
    { nombre: 'Ballerina Rosa', categoriaId: 3, talla: '35, 36, 37, 38, 39, 40', color: 'Rosa, Negro, Nude', precioCompra: 100, precioVenta: 179, codigoBarras: 'BAL-RS-001' },
    { nombre: 'Sneaker Plataforma Blanco', categoriaId: 3, talla: '35, 36, 37, 38, 39, 40', color: 'Blanco, Rosa, Negro', precioCompra: 200, precioVenta: 329, codigoBarras: 'SNK-PL-001' },
    { nombre: 'Loafer Beige', categoriaId: 3, talla: '35, 36, 37, 38, 39', color: 'Beige, Negro, Blanco', precioCompra: 160, precioVenta: 269, codigoBarras: 'LOA-BG-001' },
    
    // Formal Hombre
    { nombre: 'Oxford Negro Cuero', categoriaId: 4, talla: '39, 40, 41, 42, 43, 44', color: 'Negro, Marrón', precioCompra: 280, precioVenta: 449, codigoBarras: 'OXF-NG-001' },
    { nombre: 'Derby Marrón', categoriaId: 4, talla: '39, 40, 41, 42, 43, 44', color: 'Marrón, Negro', precioCompra: 260, precioVenta: 399, codigoBarras: 'DRB-MR-001' },
    { nombre: 'Monk Strap Negro', categoriaId: 4, talla: '40, 41, 42, 43, 44', color: 'Negro, Café', precioCompra: 300, precioVenta: 479, codigoBarras: 'MNK-NG-001' },
    
    // Formal Mujer
    { nombre: 'Tacón Stiletto Negro 10cm', categoriaId: 5, talla: '35, 36, 37, 38, 39', color: 'Negro, Rojo, Nude', precioCompra: 220, precioVenta: 359, codigoBarras: 'STL-NG-001' },
    { nombre: 'Tacón Block Nude', categoriaId: 5, talla: '35, 36, 37, 38, 39, 40', color: 'Nude, Negro, Blanco', precioCompra: 180, precioVenta: 299, codigoBarras: 'TBL-ND-001' },
    { nombre: 'Pump Clásico Rojo', categoriaId: 5, talla: '35, 36, 37, 38, 39', color: 'Rojo, Negro, Azul', precioCompra: 200, precioVenta: 329, codigoBarras: 'PMP-RJ-001' },
    
    // Sandalias
    { nombre: 'Sandalia Playa Hombre', categoriaId: 6, talla: '40, 41, 42, 43, 44', color: 'Negro, Azul, Marrón', precioCompra: 60, precioVenta: 99, codigoBarras: 'SND-PLH-001' },
    { nombre: 'Sandalia Tiras Mujer', categoriaId: 6, talla: '35, 36, 37, 38, 39', color: 'Dorado, Plateado, Negro', precioCompra: 80, precioVenta: 139, codigoBarras: 'SND-TRM-001' },
    { nombre: 'Chancla Deportiva', categoriaId: 6, talla: '38, 39, 40, 41, 42, 43', color: 'Negro, Blanco, Azul', precioCompra: 45, precioVenta: 79, codigoBarras: 'CHN-DP-001' },
    
    // Botas
    { nombre: 'Bota Chelsea Negra', categoriaId: 7, talla: '39, 40, 41, 42, 43, 44', color: 'Negro, Marrón', precioCompra: 350, precioVenta: 549, codigoBarras: 'BOT-CHL-001' },
    { nombre: 'Botín Tacón Mujer', categoriaId: 7, talla: '35, 36, 37, 38, 39', color: 'Negro, Café, Beige', precioCompra: 280, precioVenta: 449, codigoBarras: 'BTN-TCM-001' },
    { nombre: 'Bota Montaña Impermeable', categoriaId: 7, talla: '39, 40, 41, 42, 43, 44, 45', color: 'Marrón, Negro, Verde', precioCompra: 400, precioVenta: 629, codigoBarras: 'BOT-MTN-001' },
    
    // Niños
    { nombre: 'Tenis Velcro Niño', categoriaId: 8, talla: '28, 29, 30, 31, 32, 33, 34', color: 'Azul, Rojo, Negro', precioCompra: 80, precioVenta: 139, codigoBarras: 'TNS-VN-001' },
    { nombre: 'Zapatilla Luz LED Niña', categoriaId: 8, talla: '25, 26, 27, 28, 29, 30', color: 'Rosa, Morado, Blanco', precioCompra: 100, precioVenta: 169, codigoBarras: 'ZAP-LED-001' },
    { nombre: 'Sandalia Niño Verano', categoriaId: 8, talla: '24, 25, 26, 27, 28, 29, 30', color: 'Azul, Verde, Rojo', precioCompra: 50, precioVenta: 89, codigoBarras: 'SND-NV-001' },
    
    // Accesorios
    { nombre: 'Plantillas Gel Comfort', categoriaId: 9, talla: 'S, M, L, XL', color: null, precioCompra: 25, precioVenta: 49, codigoBarras: 'PLT-GEL-001' },
    { nombre: 'Cordones Premium 120cm', categoriaId: 9, talla: null, color: 'Negro, Blanco, Café', precioCompra: 8, precioVenta: 19, codigoBarras: 'CRD-120-001' },
    { nombre: 'Crema Cuero Negro', categoriaId: 9, talla: null, color: 'Negro', precioCompra: 15, precioVenta: 35, codigoBarras: 'CRM-CN-001' },
    { nombre: 'Spray Impermeabilizante', categoriaId: 9, talla: null, color: null, precioCompra: 35, precioVenta: 69, codigoBarras: 'SPR-IMP-001' }
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
        cantidad: stockInicial,
        ubicacionFisica: `Pasillo ${String.fromCharCode(65 + (producto.id % 5))}-${String(producto.id).padStart(2, '0')}`
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
  console.log('👟 Productos de zapatería creados:', productos.length);

  // 7. Crear Proveedores
  const proveedores = [
    { nombre: 'Nike Bolivia', direccion: 'Zona Sur, La Paz', celular: '71234567', contacto: 'Carlos Mendez' },
    { nombre: 'Adidas Distribuidora', direccion: 'Av. América, Cochabamba', celular: '72345678', contacto: 'Ana Rojas' },
    { nombre: 'Importadora Calzados SA', direccion: 'Zona Industrial, Santa Cruz', celular: '73456789', contacto: 'Pedro Gutierrez' },
    { nombre: 'Cueros y Pieles LTDA', direccion: 'Calle Comercio, Oruro', celular: '74567890', contacto: 'María López' }
  ];

  for (const prov of proveedores) {
    await prisma.proveedor.upsert({
      where: { id: proveedores.indexOf(prov) + 1 },
      update: {},
      create: prov
    });
  }
  console.log('🚚 Proveedores creados:', proveedores.length);

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
  console.log('👥 Clientes creados:', clientes.length);

  console.log('\n✅ Base de datos de Zapatería poblada con éxito.');
  console.log('\n📋 Credenciales de acceso:');
  console.log('   👔 Admin:  admin@zapateria.com / Admin123');
  console.log('   👤 Cajero: cajero@zapateria.com / Cajero123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });