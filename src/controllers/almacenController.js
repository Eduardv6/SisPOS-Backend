import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ==================== ALMACENES ====================

// Obtener todos los almacenes
const getAlmacenes = async (req, res) => {
    try {
        const { sucursalId } = req.query;
        const where = sucursalId ? { sucursalId: parseInt(sucursalId) } : {};

        const almacenes = await prisma.almacen.findMany({
            where,
            include: {
                sucursal: true,
                _count: { select: { inventarios: true } }
            },
            orderBy: { nombre: 'asc' }
        });
        res.json(almacenes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo almacenes' });
    }
};

// Crear almacén
const createAlmacen = async (req, res) => {
    const { nombre, sucursalId, ubicacion } = req.body;
    try {
        const almacen = await prisma.almacen.create({
            data: {
                nombre,
                sucursalId: parseInt(sucursalId),
                ubicacion
            },
            include: { sucursal: true }
        });
        res.status(201).json(almacen);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando almacén' });
    }
};

// Actualizar almacén
const updateAlmacen = async (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion } = req.body;
    try {
        const almacen = await prisma.almacen.update({
            where: { id: parseInt(id) },
            data: { nombre, ubicacion }
        });
        res.json(almacen);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Almacén no encontrado' });
        }
        res.status(500).json({ error: 'Error actualizando almacén' });
    }
};

// Eliminar almacén
const deleteAlmacen = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.almacen.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Almacén eliminado correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Almacén no encontrado' });
        }
        res.status(500).json({ error: 'Error eliminando almacén' });
    }
};

// ==================== INVENTARIO ====================

// Obtener inventario de un almacén
const getInventarioByAlmacen = async (req, res) => {
    const { almacenId } = req.params;
    try {
        const inventario = await prisma.inventario.findMany({
            where: { almacenId: parseInt(almacenId) },
            include: {
                producto: { include: { categoria: true } },
                almacen: true
            }
        });
        res.json(inventario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo inventario' });
    }
};

// Agregar/Actualizar stock
const updateStock = async (req, res) => {
    const { productoId, almacenId, cantidad, ubicacionFisica } = req.body;
    try {
        const inventario = await prisma.inventario.upsert({
            where: {
                unique_stock: {
                    productoId: parseInt(productoId),
                    almacenId: parseInt(almacenId)
                }
            },
            update: {
                cantidad: parseFloat(cantidad),
                ubicacionFisica
            },
            create: {
                productoId: parseInt(productoId),
                almacenId: parseInt(almacenId),
                cantidad: parseFloat(cantidad),
                ubicacionFisica
            },
            include: { producto: true, almacen: true }
        });
        res.json(inventario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando stock' });
    }
};

// Ajustar stock (incrementar/decrementar)
const ajustarStock = async (req, res) => {
    const { productoId, almacenId, ajuste } = req.body; // ajuste puede ser positivo o negativo
    try {
        const inventario = await prisma.inventario.update({
            where: {
                unique_stock: {
                    productoId: parseInt(productoId),
                    almacenId: parseInt(almacenId)
                }
            },
            data: {
                cantidad: { increment: parseFloat(ajuste) }
            },
            include: { producto: true, almacen: true }
        });
        res.json(inventario);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'No existe inventario para este producto en este almacén' });
        }
        res.status(500).json({ error: 'Error ajustando stock' });
    }
};

// Obtener stock de un producto en todos los almacenes
const getStockByProducto = async (req, res) => {
    const { productoId } = req.params;
    try {
        const stock = await prisma.inventario.findMany({
            where: { productoId: parseInt(productoId) },
            include: { almacen: { include: { sucursal: true } } }
        });

        const totalStock = stock.reduce((acc, inv) => acc + parseFloat(inv.cantidad), 0);

        res.json({
            productoId: parseInt(productoId),
            totalStock,
            detalle: stock
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo stock del producto' });
    }
};

export {
    getAlmacenes, createAlmacen, updateAlmacen, deleteAlmacen,
    getInventarioByAlmacen, updateStock, ajustarStock, getStockByProducto
};
