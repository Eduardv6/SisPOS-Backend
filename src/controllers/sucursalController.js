import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todas las sucursales
const getSucursales = async (req, res) => {
    try {
        const sucursales = await prisma.sucursal.findMany({
            include: {
                cajas: true,
                _count: { select: { usuarios: true, almacenes: true } }
            },
            orderBy: { nombre: 'asc' }
        });
        res.json(sucursales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo sucursales' });
    }
};

// Obtener sucursal por ID
const getSucursalById = async (req, res) => {
    const { id } = req.params;
    try {
        const sucursal = await prisma.sucursal.findUnique({
            where: { id: parseInt(id) },
            include: { cajas: true, usuarios: true, almacenes: true }
        });
        if (!sucursal) {
            return res.status(404).json({ error: 'Sucursal no encontrada' });
        }
        res.json(sucursal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo sucursal' });
    }
};

// Crear sucursal
const createSucursal = async (req, res) => {
    const { nombre, direccion } = req.body;
    try {
        const sucursal = await prisma.sucursal.create({
            data: { nombre, direccion }
        });
        res.status(201).json(sucursal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando sucursal' });
    }
};

// Actualizar sucursal
const updateSucursal = async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion } = req.body;
    try {
        const sucursal = await prisma.sucursal.update({
            where: { id: parseInt(id) },
            data: { nombre, direccion }
        });
        res.json(sucursal);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Sucursal no encontrada' });
        }
        res.status(500).json({ error: 'Error actualizando sucursal' });
    }
};

// Eliminar sucursal
const deleteSucursal = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.sucursal.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Sucursal eliminada correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Sucursal no encontrada' });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'No se puede eliminar, tiene registros asociados' });
        }
        res.status(500).json({ error: 'Error eliminando sucursal' });
    }
};

export { getSucursales, getSucursalById, createSucursal, updateSucursal, deleteSucursal };
