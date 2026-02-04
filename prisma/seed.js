import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Crear usuario administrador
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@gmail.com' },
    update: { contrasena: passwordHash },
    create: {
      nombres: 'Administrador',
      email: 'admin@gmail.com',
      contrasena: passwordHash,
      tipo: 'administrador',
      estado: true
    }
  });

  console.log('✅ Usuario admin creado:');
  console.log('   📧 Email: admin@gmail.com');
  console.log('   🔑 Contraseña: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });