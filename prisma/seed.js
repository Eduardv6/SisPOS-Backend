import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Crear Sucursales
  const sucursalesData = [
    { id: 1, nombre: 'Zapatería Telléz Central', direccion: 'Av. Santos Dumont 8vo anillo' },
    { id: 2, nombre: 'Zapatería Telléz Norte', direccion: 'Av. Banzer 4to anillo' }
  ];

  const sucursales = [];
  for (const suc of sucursalesData) {
    const s = await prisma.sucursal.upsert({
      where: { id: suc.id },
      update: { nombre: suc.nombre, direccion: suc.direccion },
      create: suc
    });
    sucursales.push(s);
  }
  console.log('🏢 Sucursales creadas:', sucursales.length);

  // 2. Crear Almacenes (Uno por sucursal)
  const almacenesData = [
    { id: 1, nombre: 'Almacén Central', sucursalId: 1, ubicacion: 'Santos Dumont' },
    { id: 2, nombre: 'Almacén Norte', sucursalId: 2, ubicacion: 'Banzer' }
  ];

  const almacenes = [];
  for (const alm of almacenesData) {
    const a = await prisma.almacen.upsert({
      where: { id: alm.id },
      update: { nombre: alm.nombre, sucursalId: alm.sucursalId },
      create: alm
    });
    almacenes.push(a);
  }
  console.log('📦 Almacenes creados:', almacenes.length);

  // 3. Crear Cajas (Una por sucursal)
  const cajasData = [
    { id: 1, nombre: 'Caja Central 1', codigo: 'CAJA-001', sucursalId: 1 },
    { id: 2, nombre: 'Caja Norte 1', codigo: 'CAJA-002', sucursalId: 2 }
  ];

  for (const caj of cajasData) {
    await prisma.caja.upsert({
      where: { id: caj.id },
      update: { nombre: caj.nombre, sucursalId: caj.sucursalId },
      create: { ...caj, estado: 'CERRADA' }
    });
  }
  console.log('💰 Cajas creadas');

  // 4. Crear Usuarios
  const passwordHash = await bcrypt.hash('123456', 10);
  
  // Admin
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@zapateria.com' },
    update: { contrasena: passwordHash },
    create: {
      nombres: 'Administrador General',
      email: 'admin@zapateria.com',
      contrasena: passwordHash,
      tipo: 'administrador',
      estado: true,
      sucursalId: 1
    }
  });

  // Cajero Central (Asignado a Caja 1)
  const cajero1 = await prisma.usuario.upsert({
    where: { email: 'cajero1@zapateria.com' },
    update: { cajaId: 1, sucursalId: 1 },
    create: {
      nombres: 'Ana Cajera Central',
      email: 'cajero1@zapateria.com',
      contrasena: passwordHash,
      tipo: 'cajero',
      estado: true,
      sucursalId: 1,
      cajaId: 1
    }
  });

  // Cajero Norte (Asignado a Caja 2)
  const cajero2 = await prisma.usuario.upsert({
    where: { email: 'cajero2@zapateria.com' },
    update: { cajaId: 2, sucursalId: 2 },
    create: {
      nombres: 'Pedro Cajero Norte',
      email: 'cajero2@zapateria.com',
      contrasena: passwordHash,
      tipo: 'cajero',
      estado: true,
      sucursalId: 2,
      cajaId: 2
    }
  });

  console.log('👤 Usuarios creados: Admin, Cajero1 (Caja1), Cajero2 (Caja2)');

  // 5. Crear Clientes
  const clientesData = [
    { id: 1, nombre: 'Juan Pérez', email: 'juan.perez@email.com', celular: '70000001', direccion: 'Av. Cristóbal de Mendoza #123' },
    { id: 2, nombre: 'María González', email: 'maria.gonzalez@email.com', celular: '70000002', direccion: 'Calle Sucre #456' },
    { id: 3, nombre: 'Carlos Rodríguez', email: 'carlos.rodriguez@email.com', celular: '70000003', direccion: 'Av. Irala #789' },
    { id: 4, nombre: 'Ana Martínez', email: 'ana.martinez@email.com', celular: '70000004', direccion: 'Calle Warnes #321' },
    { id: 5, nombre: 'Pedro López', email: 'pedro.lopez@email.com', celular: '70000005', direccion: 'Av. Cristo Redentor #654' }
  ];

  for (const cliente of clientesData) {
    await prisma.cliente.upsert({
      where: { id: cliente.id },
      update: { nombre: cliente.nombre, email: cliente.email, celular: cliente.celular, direccion: cliente.direccion },
      create: cliente
    });
  }

  console.log('👥 Clientes creados:', clientesData.length);

  console.log('✅ Base de datos poblada con éxito (v2)');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });