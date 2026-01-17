import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando sembrado de datos...');

  //Marcas
  await prisma.brand.createMany({
    data: [
      { name: 'Nike' },
      { name: 'Adidas' },
      { name: 'Puma' },
      { name: 'Generico' }, // Para productos sin marca
    ],
    skipDuplicates: true,
  });

  //Categorías (Padres e Hijos)
  //Creamos primero las categorías padre
  const catHombre = await prisma.category.create({ data: { name: 'Hombre' } });
  const catMujer = await prisma.category.create({ data: { name: 'Mujer' } });

  //Creamos subcategorías vinculadas a los padres
  await prisma.category.createMany({
    data: [
      { name: 'Deportivo', parentId: catHombre.id },
      { name: 'Formal', parentId: catHombre.id },
      { name: 'Tacones', parentId: catMujer.id },
      { name: 'Sandalias', parentId: catMujer.id },
    ],
    skipDuplicates: true,
  });

  //Tallas
  await prisma.size.createMany({
    data: [
      { value: '38' }, { value: '39' }, { value: '40' }, 
      { value: '41' }, { value: '42' }, { value: '43' }
    ],
    skipDuplicates: true,
  });

  //Colores
  await prisma.color.createMany({
    data: [
      { name: 'Negro'},
      { name: 'Blanco'},
      { name: 'Rojo'},
      { name: 'Azul'},
    ],
    skipDuplicates: true,
  });

  //Crear Usuario Administrador
  const passwordHash = await bcrypt.hash('Admin123', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: passwordHash,
      role: 'ADMIN',
      isActive: true
    },
  });

  console.log('👤 Usuario Admin creado: admin / admin123');
  console.log('Base de datos poblada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });