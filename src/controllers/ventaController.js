import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Crear venta
const createVenta = async (req, res) => {
    const {
        items,           // Array: [{ productoId, cantidad, precioUnitario }, ...]
        clienteId,       // Opcional
        sesionCajaId,    // ID de la sesión de caja activa
        tipoDocumento,   // factura, boleta, ticket
        total
    } = req.body;

    const usuarioId = req.user.id;
    const sucursalId = req.user.sucursalId;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
    }

    try {
        // Verificar sesión de caja activa
        const sesion = await prisma.sesionCaja.findUnique({
            where: { id: parseInt(sesionCajaId) },
            include: { caja: true }
        });

        if (!sesion || sesion.estado !== 'ABIERTA') {
            return res.status(400).json({ error: 'No hay una sesión de caja activa válida' });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Generar número de documento
            const lastVenta = await tx.venta.findFirst({
                orderBy: { id: 'desc' }
            });
            const numeroDocumento = `${tipoDocumento?.toUpperCase() || 'TKT'}-${String((lastVenta?.id || 0) + 1).padStart(8, '0')}`;

            // Crear venta
            const venta = await tx.venta.create({
                data: {
                    usuarioId,
                    sucursalId: sucursalId || sesion.caja.sucursalId,
                    cajaId: sesion.cajaId,
                    sesionCajaId: parseInt(sesionCajaId),
                    clienteId: clienteId ? parseInt(clienteId) : null,
                    tipoDocumento: tipoDocumento || 'ticket',
                    numeroDocumento,
                    total: parseFloat(total),
                    estado: 'completada'
                }
            });

            // Crear detalles de venta
            for (const item of items) {
                const subtotal = item.cantidad * parseFloat(item.precioUnitario);

                await tx.detalleVenta.create({
                    data: {
                        ventaId: venta.id,
                        productoId: parseInt(item.productoId),
                        cantidad: parseInt(item.cantidad),
                        precioUnitario: parseFloat(item.precioUnitario),
                        subtotal
                    }
                });

                // Actualizar inventario (si se controla stock)
                const producto = await tx.producto.findUnique({
                    where: { id: parseInt(item.productoId) }
                });

                if (producto?.controlarStock) {
                    // Buscar inventario en el almacén de la sucursal
                    const almacen = await tx.almacen.findFirst({
                        where: { sucursalId: sucursalId || sesion.caja.sucursalId }
                    });

                    if (almacen) {
                        await tx.inventario.updateMany({
                            where: {
                                productoId: parseInt(item.productoId),
                                almacenId: almacen.id
                            },
                            data: {
                                cantidad: { decrement: parseInt(item.cantidad) }
                            }
                        });
                    }
                }
            }

            return venta;
        });

        // Obtener venta completa con detalles
        const ventaCompleta = await prisma.venta.findUnique({
            where: { id: result.id },
            include: {
                detalles: { include: { producto: true } },
                cliente: true,
                usuario: { select: { id: true, nombres: true } }
            }
        });

        res.status(201).json({
            message: 'Venta registrada con éxito',
            venta: ventaCompleta
        });

    } catch (error) {
        console.error('Error en la transacción de venta:', error);
        res.status(500).json({ error: 'Error al procesar la venta' });
    }
};

// Obtener ventas
const getVentas = async (req, res) => {
    try {
        const { page = 1, limit = 20, fecha, estado, usuarioId, sucursalId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            ...(estado && { estado }),
            ...(usuarioId && { usuarioId: parseInt(usuarioId) }),
            ...(sucursalId && { sucursalId: parseInt(sucursalId) }),
            ...(fecha && {
                fecha: {
                    gte: new Date(fecha),
                    lt: new Date(new Date(fecha).setDate(new Date(fecha).getDate() + 1))
                }
            })
        };

        const [total, ventas] = await prisma.$transaction([
            prisma.venta.count({ where }),
            prisma.venta.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    cliente: true,
                    usuario: { select: { id: true, nombres: true } },
                    detalles: { include: { producto: true } }
                },
                orderBy: { fecha: 'desc' }
            })
        ]);

        res.json({
            data: ventas,
            meta: {
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo ventas' });
    }
};

// Obtener venta por ID
const getVentaById = async (req, res) => {
    const { id } = req.params;
    try {
        const venta = await prisma.venta.findUnique({
            where: { id: parseInt(id) },
            include: {
                detalles: { include: { producto: { include: { categoria: true } } } },
                cliente: true,
                usuario: { select: { id: true, nombres: true } },
                sesionCaja: { include: { caja: true } }
            }
        });

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        res.json(venta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo venta' });
    }
};

// Anular venta
const anularVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const venta = await prisma.venta.findUnique({
            where: { id: parseInt(id) },
            include: { detalles: true }
        });

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        if (venta.estado === 'anulada') {
            return res.status(400).json({ error: 'Esta venta ya está anulada' });
        }

        await prisma.$transaction(async (tx) => {
            // Anular venta
            await tx.venta.update({
                where: { id: parseInt(id) },
                data: { estado: 'anulada' }
            });

            // Devolver stock
            for (const detalle of venta.detalles) {
                const producto = await tx.producto.findUnique({
                    where: { id: detalle.productoId }
                });

                if (producto?.controlarStock) {
                    const almacen = await tx.almacen.findFirst({
                        where: { sucursalId: venta.sucursalId }
                    });

                    if (almacen) {
                        await tx.inventario.updateMany({
                            where: {
                                productoId: detalle.productoId,
                                almacenId: almacen.id
                            },
                            data: {
                                cantidad: { increment: detalle.cantidad }
                            }
                        });
                    }
                }
            }
        });

        res.json({ message: 'Venta anulada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error anulando venta' });
    }
};

export { createVenta, getVentas, getVentaById, anularVenta };
