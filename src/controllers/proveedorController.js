import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todos los proveedores
const getProveedores = async (req, res) => {
    try {
        const { search } = req.query;
        const where = search ? {
            OR: [
                { nombre: { contains: search } },
                { contacto: { contains: search } }
            ]
        } : {};

        const proveedores = await prisma.proveedor.findMany({
            where,
            orderBy: { nombre: 'asc' }
        });
        res.json(proveedores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo proveedores' });
    }
};

// Obtener proveedor por ID
const getProveedorById = async (req, res) => {
    const { id } = req.params;
    try {
        const proveedor = await prisma.proveedor.findUnique({
            where: { id: parseInt(id) },
            include: { compras: { take: 10, orderBy: { fecha: 'desc' } } }
        });
        if (!proveedor) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        res.json(proveedor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo proveedor' });
    }
};

// Crear proveedor
const createProveedor = async (req, res) => {
    const { nombre, direccion, celular, contacto } = req.body;
    try {
        const proveedor = await prisma.proveedor.create({
            data: { nombre, direccion, celular, contacto }
        });
        res.status(201).json(proveedor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando proveedor' });
    }
};

// Actualizar proveedor
const updateProveedor = async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, celular, contacto } = req.body;
    try {
        const proveedor = await prisma.proveedor.update({
            where: { id: parseInt(id) },
            data: { nombre, direccion, celular, contacto }
        });
        res.json(proveedor);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        res.status(500).json({ error: 'Error actualizando proveedor' });
    }
};

// Eliminar proveedor
const deleteProveedor = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.proveedor.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Proveedor eliminado correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        res.status(500).json({ error: 'Error eliminando proveedor' });
    }
};

export { getProveedores, getProveedorById, createProveedor, updateProveedor, deleteProveedor };
