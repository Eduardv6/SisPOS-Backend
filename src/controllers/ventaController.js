import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Crear venta
const createVenta = async (req, res) => {
    const {
        tipoDocumento,      // "factura" | "boleta" | "ticket"
        numeroDocumento,    // Opcional - se genera automáticamente si no se proporciona
        clienteId,          // Opcional
        clienteNombre,      // Nombre del cliente (para mostrar)
        cajaId,             // ID de la caja
        usuarioId,          // ID del vendedor
        metodoPago,         // "efectivo" | "tarjeta" | "credito" | "mixto"
        montoRecibido,      // Monto pagado por el cliente
        vuelto,             // Vuelto entregado
        subtotal,
        descuento,
        total,
        items               // Array de productos
    } = req.body;

    // Validaciones básicas
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'La venta debe tener al menos un producto' });
    }

    if (!cajaId || !usuarioId) {
        return res.status(400).json({ message: 'cajaId y usuarioId son requeridos' });
    }

    try {
        // 1. Verificar que la caja existe y está abierta
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(cajaId) },
            include: { sucursal: true }
        });

        if (!caja) {
            return res.status(404).json({ message: 'Caja no encontrada' });
        }

        if (caja.estado !== 'OCUPADA') {
            return res.status(400).json({ message: 'La caja no está abierta' });
        }

        // 2. Buscar la sesión de caja activa
        const sesionActiva = await prisma.sesionCaja.findFirst({
            where: {
                cajaId: parseInt(cajaId),
                estado: 'ABIERTA'
            }
        });

        if (!sesionActiva) {
            return res.status(400).json({ message: 'No hay una sesión de caja activa' });
        }

        // 3. Buscar almacén de la sucursal para actualizar inventario
        const almacen = await prisma.almacen.findFirst({
            where: { sucursalId: caja.sucursalId }
        });

        // 4. Ejecutar transacción
        const result = await prisma.$transaction(async (tx) => {
            // Generar número de documento si no se proporciona
            let numDoc = numeroDocumento;
            if (!numDoc) {
                const prefijo = tipoDocumento === 'factura' ? 'F' : tipoDocumento === 'boleta' ? 'B' : 'T';
                const lastVenta = await tx.venta.findFirst({
                    where: { tipoDocumento: tipoDocumento || 'ticket' },
                    orderBy: { id: 'desc' }
                });
                numDoc = `${prefijo}001-${String((lastVenta?.id || 0) + 1).padStart(6, '0')}`;
            }

            // Crear venta
            const venta = await tx.venta.create({
                data: {
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    sucursalId: caja.sucursalId,
                    cajaId: parseInt(cajaId),
                    sesionCaja: { connect: { id: sesionActiva.id } },
                    ...(clienteId && { cliente: { connect: { id: parseInt(clienteId) } } }),
                    tipoDocumento: tipoDocumento || 'ticket',
                    numeroDocumento: numDoc,
                    total: parseFloat(total),
                    estado: 'completada'
                }
            });

            // Crear detalles de venta y actualizar inventario
            for (const item of items) {
                const itemSubtotal = item.cantidad * parseFloat(item.precioUnitario);

                await tx.detalleVenta.create({
                    data: {
                        venta: { connect: { id: venta.id } },
                        producto: { connect: { id: parseInt(item.productoId) } },
                        cantidad: parseInt(item.cantidad),
                        precioUnitario: parseFloat(item.precioUnitario),
                        subtotal: itemSubtotal
                    }
                });


                // Actualizar inventario en almacén si existe
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

                    // Registrar movimiento de inventario (SALIDA por venta)
                    await tx.movimientoInventario.create({
                        data: {
                            producto: { connect: { id: parseInt(item.productoId) } },
                            almacen: { connect: { id: almacen.id } },
                            tipo: 'SALIDA',
                            cantidad: parseInt(item.cantidad),
                            motivo: `Venta ${numDoc}`,
                            usuario: { connect: { id: parseInt(usuarioId) } }
                        }
                    });
                }
            }

            // Registrar movimiento de caja (ingreso de efectivo) y actualizar saldo
            if (metodoPago === 'efectivo' || metodoPago === 'mixto') {
                await tx.movimientoCaja.create({
                    data: {
                        sesionCaja: { connect: { id: sesionActiva.id } },
                        usuario: { connect: { id: parseInt(usuarioId) } },
                        tipo: 'INGRESO',
                        monto: parseFloat(total),
                        motivo: `Venta ${numDoc}`
                    }
                });

                // Actualizar saldo de la caja
                await tx.caja.update({
                    where: { id: parseInt(cajaId) },
                    data: {
                        saldoActual: { increment: parseFloat(total) }
                    }
                });
            }

            return venta;
        });

        // 5. Obtener venta completa con detalles
        const ventaCompleta = await prisma.venta.findUnique({
            where: { id: result.id },
            include: {
                detalles: { include: { producto: true } },
                cliente: true,
                usuario: { select: { id: true, nombres: true } }
            }
        });

        res.status(201).json({
            message: 'Venta registrada exitosamente',
            venta: {
                id: ventaCompleta.id,
                numeroDocumento: ventaCompleta.numeroDocumento,
                tipoDocumento: ventaCompleta.tipoDocumento,
                total: parseFloat(ventaCompleta.total),
                fechaVenta: ventaCompleta.fecha,
                items: ventaCompleta.detalles,
                cliente: ventaCompleta.cliente
            }
        });

    } catch (error) {
        console.error('Error en la transacción de venta:', error);
        res.status(500).json({ message: 'Error al procesar la venta' });
    }
};

// Obtener ventas
const getVentas = async (req, res) => {
    try {
        const { page = 1, limit = 20, fecha, fechaInicio, fechaFin, estado, usuarioId, sucursalId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            ...(estado && { estado }),
            ...(usuarioId && { usuarioId: parseInt(usuarioId) }),
            ...(sucursalId && { sucursalId: parseInt(sucursalId) })
        };

        // Filtro por fecha específica
        if (fecha) {
            where.fecha = {
                gte: new Date(fecha),
                lt: new Date(new Date(fecha).setDate(new Date(fecha).getDate() + 1))
            };
        }

        // Filtro por rango de fechas (fechaInicio y fechaFin)
        if (fechaInicio || fechaFin) {
            where.fecha = where.fecha || {};
            if (fechaInicio) {
                where.fecha.gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                const endDate = new Date(fechaFin);
                endDate.setDate(endDate.getDate() + 1);
                where.fecha.lt = endDate;
            }
        }

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

        // Formatear respuesta con items estructurados
        const data = ventas.map(venta => ({
            id: venta.id,
            fecha: venta.fecha,
            total: parseFloat(venta.total),
            clienteNombre: venta.cliente?.nombre || 'Cliente General',
            metodoPago: 'Efectivo', // Campo no existe en el modelo actual
            estado: venta.estado,
            tipoDocumento: venta.tipoDocumento,
            numeroDocumento: venta.numeroDocumento,
            usuario: venta.usuario,
            items: venta.detalles.map(detalle => ({
                id: detalle.id,
                productoId: detalle.productoId,
                nombre: detalle.producto?.nombre || 'Producto',
                cantidad: detalle.cantidad,
                precioUnitario: parseFloat(detalle.precioUnitario),
                subtotal: parseFloat(detalle.subtotal)
            }))
        }));

        res.json({
            data,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            totalItems: total
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
