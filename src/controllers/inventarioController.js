import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener inventario de un almacén
const getInventarioByAlmacen = async (req, res) => {
    const { almacenId } = req.params;
    try {
        // Validación de permisos
        if (req.user.tipo !== 'administrador' && req.user.sucursalId) {
            const almacen = await prisma.almacen.findUnique({
                where: { id: parseInt(almacenId) },
                select: { sucursalId: true }
            });
            if (almacen && almacen.sucursalId !== req.user.sucursalId) {
                return res.status(403).json({ error: 'No tienes permiso para ver este almacén' });
            }
        }

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
        // Validación de permisos
        if (req.user.tipo !== 'administrador' && req.user.sucursalId) {
            const almacen = await prisma.almacen.findUnique({
                where: { id: parseInt(almacenId) },
                select: { sucursalId: true }
            });
            if (!almacen || almacen.sucursalId !== req.user.sucursalId) {
                return res.status(403).json({ error: 'No tienes permiso para modificar este almacén' });
            }
        }

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

            // 2. Recalcular y actualizar stock total del producto
            const totalStock = await tx.inventario.aggregate({
                where: { productoId: parseInt(productoId) },
                _sum: { cantidad: true }
            });

            await tx.producto.update({
                where: { id: parseInt(productoId) },
                data: { stock: totalStock._sum.cantidad || 0 }
            });

            return inventario;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando stock' });
    }
};

// Ajustar stock (incrementar/decrementar relativo)
const ajustarStock = async (req, res) => {
    const { productoId, almacenId, ajuste, motivo } = req.body;
    const usuarioId = req.user?.id; 
    
    try {
        // Validación de permisos
        if (req.user.tipo !== 'administrador' && req.user.sucursalId) {
            const almacen = await prisma.almacen.findUnique({
                where: { id: parseInt(almacenId) },
                select: { sucursalId: true }
            });
            if (!almacen || almacen.sucursalId !== req.user.sucursalId) {
                return res.status(403).json({ error: 'No tienes permiso para modificar este almacén' });
            }
        }

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

            // 4. Recalcular y actualizar stock total del producto
            const totalStock = await tx.inventario.aggregate({
                where: { productoId: parseInt(productoId) },
                _sum: { cantidad: true }
            });

            await tx.producto.update({
                where: { id: parseInt(productoId) },
                data: { stock: totalStock._sum.cantidad || 0 }
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

        // Filtro de sucursal
        if (req.user.tipo !== 'administrador') {
            if (req.user.sucursalId) {
                // Filtrar movimientos de almacenes de mi sucursal
                where.almacen = {
                    sucursalId: req.user.sucursalId
                };
            }
        }

        const [total, movimientos] = await prisma.$transaction([
            prisma.movimientoInventario.count({ where }),
            prisma.movimientoInventario.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    producto: { select: { nombre: true, codigoBarras: true, talla: true, color: true } },
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
        let whereAlmacen = {}; 
        
        // Filtro de sucursal
        if (req.user.tipo !== 'administrador') {
            if (req.user.sucursalId) {
                whereAlmacen = { sucursalId: req.user.sucursalId };
            }
        }

        const stock = await prisma.inventario.findMany({
            where: { 
                productoId: parseInt(productoId),
                almacen: whereAlmacen 
            },
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

// Transferir stock entre almacenes (busca producto equivalente en destino)
const transferirStock = async (req, res) => {
    const { productoOrigenId, almacenOrigenId, almacenDestinoId, cantidad } = req.body;
    const usuarioId = req.user?.id;
    
    console.log('\n🔄 TRANSFERENCIA INICIADA:');
    console.log('   productoOrigenId:', productoOrigenId);
    console.log('   almacenOrigenId:', almacenOrigenId);
    console.log('   almacenDestinoId:', almacenDestinoId);
    console.log('   cantidad:', cantidad);
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Obtener el producto origen con sus datos
            const productoOrigen = await tx.producto.findUnique({
                where: { id: parseInt(productoOrigenId) },
                include: { inventarios: true }
            });
            
            if (!productoOrigen) {
                throw new Error('Producto origen no encontrado');
            }
            
            console.log('   Producto origen:', productoOrigen.nombre, '- Talla:', productoOrigen.talla, '- Color:', productoOrigen.color);
            
            // 2. Verificar que hay suficiente stock en el almacén origen
            const inventarioOrigen = await tx.inventario.findUnique({
                where: {
                    unique_stock: {
                        productoId: parseInt(productoOrigenId),
                        almacenId: parseInt(almacenOrigenId)
                    }
                }
            });
            
            if (!inventarioOrigen || parseFloat(inventarioOrigen.cantidad) < parseInt(cantidad)) {
                throw new Error(`Stock insuficiente en almacén origen. Disponible: ${inventarioOrigen?.cantidad || 0}`);
            }
            
            // 3. Buscar producto equivalente en el almacén destino (mismo nombre, talla, color)
            let productoDestino = await tx.producto.findFirst({
                where: {
                    nombre: productoOrigen.nombre,
                    talla: productoOrigen.talla,
                    color: productoOrigen.color,
                    almacenId: parseInt(almacenDestinoId)
                }
            });
            
            console.log('   Producto destino encontrado:', productoDestino ? `ID ${productoDestino.id}` : 'NO - Se creará uno nuevo');
            
            // 4. Si no existe producto en destino, crearlo
            if (!productoDestino) {
                // Obtener el almacén destino para saber su sucursalId
                const almacenDestino = await tx.almacen.findUnique({
                    where: { id: parseInt(almacenDestinoId) }
                });
                
                if (!almacenDestino) {
                    throw new Error('Almacén destino no encontrado');
                }
                
                productoDestino = await tx.producto.create({
                    data: {
                        nombre: productoOrigen.nombre,
                        categoriaId: productoOrigen.categoriaId,
                        sucursalId: almacenDestino.sucursalId,
                        almacenId: parseInt(almacenDestinoId),
                        talla: productoOrigen.talla,
                        color: productoOrigen.color,
                        precioCompra: productoOrigen.precioCompra,
                        precioVenta: productoOrigen.precioVenta,
                        codigoBarras: null, // No duplicar código de barras
                        codigoInterno: productoOrigen.codigoInterno,
                        stock: 0,
                        stockMinimo: productoOrigen.stockMinimo
                    }
                });
                
                console.log('   Producto creado en destino con ID:', productoDestino.id);
            }
            
            // 5. Restar del inventario origen
            const inventarioOrigenActualizado = await tx.inventario.update({
                where: {
                    unique_stock: {
                        productoId: parseInt(productoOrigenId),
                        almacenId: parseInt(almacenOrigenId)
                    }
                },
                data: {
                    cantidad: { decrement: parseInt(cantidad) }
                }
            });
            
            // 6. Sumar al inventario destino (upsert por si no existe)
            const inventarioDestinoActualizado = await tx.inventario.upsert({
                where: {
                    unique_stock: {
                        productoId: productoDestino.id,
                        almacenId: parseInt(almacenDestinoId)
                    }
                },
                update: {
                    cantidad: { increment: parseInt(cantidad) }
                },
                create: {
                    productoId: productoDestino.id,
                    almacenId: parseInt(almacenDestinoId),
                    cantidad: parseInt(cantidad),
                    ubicacionFisica: 'N/A'
                }
            });
            
            // 7. Registrar movimiento de SALIDA en origen
            await tx.movimientoInventario.create({
                data: {
                    productoId: parseInt(productoOrigenId),
                    almacenId: parseInt(almacenOrigenId),
                    tipo: 'SALIDA',
                    cantidad: parseInt(cantidad),
                    motivo: `Transferencia a almacén ID ${almacenDestinoId}`,
                    usuarioId: usuarioId ? parseInt(usuarioId) : null
                }
            });
            
            // 8. Registrar movimiento de ENTRADA en destino
            await tx.movimientoInventario.create({
                data: {
                    productoId: productoDestino.id,
                    almacenId: parseInt(almacenDestinoId),
                    tipo: 'ENTRADA',
                    cantidad: parseInt(cantidad),
                    motivo: `Transferencia desde almacén ID ${almacenOrigenId}`,
                    usuarioId: usuarioId ? parseInt(usuarioId) : null
                }
            });
            
            // 9. Recalcular y actualizar stock total del producto ORIGEN
            const totalStockOrigen = await tx.inventario.aggregate({
                where: { productoId: parseInt(productoOrigenId) },
                _sum: { cantidad: true }
            });
            
            await tx.producto.update({
                where: { id: parseInt(productoOrigenId) },
                data: { stock: totalStockOrigen._sum.cantidad || 0 }
            });
            
            // 10. Recalcular y actualizar stock total del producto DESTINO
            const totalStockDestino = await tx.inventario.aggregate({
                where: { productoId: productoDestino.id },
                _sum: { cantidad: true }
            });
            
            await tx.producto.update({
                where: { id: productoDestino.id },
                data: { stock: totalStockDestino._sum.cantidad || 0 }
            });
            
            console.log('✅ TRANSFERENCIA COMPLETADA:');
            console.log('   Stock origen actualizado:', totalStockOrigen._sum.cantidad);
            console.log('   Stock destino actualizado:', totalStockDestino._sum.cantidad);
            
            return {
                productoOrigenId: parseInt(productoOrigenId),
                productoDestinoId: productoDestino.id,
                cantidadTransferida: parseInt(cantidad),
                stockOrigenNuevo: totalStockOrigen._sum.cantidad || 0,
                stockDestinoNuevo: totalStockDestino._sum.cantidad || 0
            };
        });
        
        res.json(result);
    } catch (error) {
        console.error('❌ ERROR en transferencia:', error);
        res.status(500).json({ error: error.message || 'Error en la transferencia' });
    }
};

export {
    getInventarioByAlmacen,
    updateStock,
    ajustarStock,
    getStockByProducto,
    getMovimientos,
    transferirStock
};
