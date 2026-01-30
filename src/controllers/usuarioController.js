import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

// Validar contraseña fuerte
const validatePassword = (password) => {
    // Mínimo 8 caracteres
    if (password.length < 8) {
        return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    
    // Al menos una mayúscula
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula' };
    }
    
    // Al menos un número
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'La contraseña debe contener al menos un número' };
    }
    
    return { valid: true };
};

// Obtener todos los usuarios
const getUsuarios = async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            include: { sucursal: true },
            orderBy: { nombres: 'asc' }
        });
        // Excluir contraseña
        const result = usuarios.map(({ contrasena, ...user }) => user);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
};

// Obtener usuario por ID
const getUsuarioById = async (req, res) => {
    const { id } = req.params;
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: parseInt(id) },
            include: { sucursal: true, permisos: true, caja: true }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const { contrasena, ...result } = usuario;
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo usuario' });
    }
};

// Crear usuario
const createUsuario = async (req, res) => {
    const { nombres, email, password, nroDoc, telefono, tipo, sucursalId, estado, permisos, cajaId } = req.body;
    try {
        const existingUser = await prisma.usuario.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Validar que la contraseña sea fuerte
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const usuario = await prisma.usuario.create({
            data: {
                nombres,
                email,
                contrasena: passwordHash,
                nroDoc,
                telefono,
                tipo: tipo || 'cajero',
                estado: estado !== undefined ? estado : true, // Por defecto activo
                sucursalId: sucursalId ? parseInt(sucursalId) : null,
                cajaId: cajaId ? parseInt(cajaId) : null,
                permisos: permisos ? {
                    create: permisos.map(p => ({ permiso: p }))
                } : undefined
            },
            include: { sucursal: true, caja: true }
        });

        const { contrasena, ...result } = usuario;
        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando usuario' });
    }
};

// Actualizar usuario
const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombres, email, password, nroDoc, telefono, tipo, sucursalId, estado, permisos, cajaId } = req.body;

    try {
        const data = {
            nombres,
            email,
            nroDoc,
            telefono,
            tipo,
            estado,
            sucursalId: sucursalId ? parseInt(sucursalId) : null,
            cajaId: cajaId ? parseInt(cajaId) : null
        };

        // Si se envía nueva contraseña, hashearla
        if (password) {
            // Validar que la contraseña sea fuerte
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({ error: passwordValidation.message });
            }
            data.contrasena = await bcrypt.hash(password, 10);
        }

        // Actualizar permisos si se envían
        if (permisos) {
            await prisma.permisoUsuario.deleteMany({ where: { usuarioId: parseInt(id) } });
            await prisma.permisoUsuario.createMany({
                data: permisos.map(p => ({ usuarioId: parseInt(id), permiso: p }))
            });
        }

        const usuario = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data,
            include: { sucursal: true, permisos: true, caja: true }
        });

        const { contrasena, ...result } = usuario;
        res.json(result);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
};

// Eliminar usuario (soft delete)
const deleteUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: { estado: false }
        });
        res.json({ message: 'Usuario desactivado correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
};

export { getUsuarios, getUsuarioById, createUsuario, updateUsuario, deleteUsuario };
