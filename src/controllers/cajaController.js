import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todas las cajas
const getCajas = async (req, res) => {
    try {
        const { sucursalId } = req.query;
        const where = sucursalId ? { sucursalId: parseInt(sucursalId) } : {};

        const cajas = await prisma.caja.findMany({
            where,
            include: { sucursal: true },
            orderBy: { nombre: 'asc' }
        });
        res.json(cajas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo cajas' });
    }
};

// Obtener caja por ID
const getCajaById = async (req, res) => {
    const { id } = req.params;
    try {
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(id) },
            include: { sucursal: true, sesiones: { take: 5, orderBy: { fechaInicio: 'desc' } } }
        });
        if (!caja) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }
        res.json(caja);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo caja' });
    }
};

// Crear caja
const createCaja = async (req, res) => {
    const { nombre, sucursalId, codigo } = req.body;
    try {
        const caja = await prisma.caja.create({
            data: {
                nombre,
                sucursalId: parseInt(sucursalId),
                codigo,
                estado: 'CERRADA'
            },
            include: { sucursal: true }
        });
        res.status(201).json(caja);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando caja' });
    }
};

// Actualizar caja
const updateCaja = async (req, res) => {
    const { id } = req.params;
    const { nombre, sucursalId, codigo, estado } = req.body;
    try {
        const caja = await prisma.caja.update({
            where: { id: parseInt(id) },
            data: {
                nombre,
                sucursalId: sucursalId ? parseInt(sucursalId) : undefined,
                codigo,
                estado
            },
            include: { sucursal: true }
        });
        res.json(caja);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }
        res.status(500).json({ error: 'Error actualizando caja' });
    }
};

// Eliminar caja
const deleteCaja = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.caja.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Caja eliminada correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'No se puede eliminar, tiene sesiones asociadas' });
        }
        res.status(500).json({ error: 'Error eliminando caja' });
    }
};

export { getCajas, getCajaById, createCaja, updateCaja, deleteCaja };
