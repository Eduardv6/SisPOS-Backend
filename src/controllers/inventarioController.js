import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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

// Agregar/Actualizar stock (Setear valor absoluto)
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
        
        // También actualizar el stock total en la tabla Producto si es la misma relación
        // (Opcional: dependerá de si quieres mantener sincronizado el producto.stock con la suma de inventarios)
        // Por ahora mantenemos la lógica simple de inventario por almacén.

        res.json(inventario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando stock' });
    }
};

// Ajustar stock (incrementar/decrementar relativo)
const ajustarStock = async (req, res) => {
    const { productoId, almacenId, ajuste, motivo, usuarioId } = req.body; 
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Actualizar inventario por almacén
            const inventario = await tx.inventario.upsert({
                where: {
                    unique_stock: {
                        productoId: parseInt(productoId),
                        almacenId: parseInt(almacenId)
                    }
                },
                update: {
                    cantidad: { increment: parseFloat(ajuste) }
                },
                create: {
                    productoId: parseInt(productoId),
                    almacenId: parseInt(almacenId),
                    cantidad: parseFloat(ajuste),
                    ubicacionFisica: 'N/A'
                }
            });

            // 2. Actualizar stock total del producto
            await tx.producto.update({
                where: { id: parseInt(productoId) },
                data: {
                    stock: { increment: parseFloat(ajuste) }
                }
            });

            // 3. Registrar movimiento en Kardex
            await tx.movimientoInventario.create({
                data: {
                    productoId: parseInt(productoId),
                    almacenId: parseInt(almacenId),
                    tipo: parseFloat(ajuste) >= 0 ? 'ENTRADA' : 'SALIDA',
                    cantidad: Math.abs(parseFloat(ajuste)),
                    motivo: motivo || 'Ajuste manual de inventario',
                    usuarioId: usuarioId ? parseInt(usuarioId) : null
                }
            });

            return inventario;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error ajustando stock' });
    }
};

// Obtener historial de movimientos (Kardex)
const getMovimientos = async (req, res) => {
    try {
        const { page = 1, limit = 20, productoId, almacenId, tipo, fechaInicio, fechaFin } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            ...(productoId && { productoId: parseInt(productoId) }),
            ...(almacenId && { almacenId: parseInt(almacenId) }),
            ...(tipo && { tipo }),
            ...(fechaInicio && fechaFin && {
                createdAt: {
                    gte: new Date(fechaInicio),
                    lte: new Date(fechaFin)
                }
            })
        };

        const [total, movimientos] = await prisma.$transaction([
            prisma.movimientoInventario.count({ where }),
            prisma.movimientoInventario.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    producto: { select: { nombre: true, codigoBarras: true } },
                    almacen: { select: { nombre: true, sucursal: { select: { nombre: true } } } },
                    usuario: { select: { nombres: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        res.json({
            data: movimientos,
            meta: {
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo historial de movimientos' });
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
    getInventarioByAlmacen,
    updateStock,
    ajustarStock,
    getStockByProducto,
    getMovimientos
};
