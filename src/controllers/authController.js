import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { sucursal: true }
    });

    if (!usuario || !usuario.estado) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }

    const isMatch = await bcrypt.compare(password, usuario.contrasena);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        tipo: usuario.tipo,
        email: usuario.email,
        nombres: usuario.nombres,
        sucursalId: usuario.sucursalId
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Bienvenido al sistema',
      token,
      user: {
        id: usuario.id,
        nombres: usuario.nombres,
        email: usuario.email,
        tipo: usuario.tipo,
        sucursal: usuario.sucursal
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

export { login };