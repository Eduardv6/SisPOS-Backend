import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Reporte de Ventas por Período (Diario / Semanal / Mensual)
const getVentasPorPeriodo = async (req, res) => {
    try {
        const { periodo = 'mensual', fecha, fechaInicio: fInicio, fechaFin: fFin } = req.query; 
        
        let fechaInicio = new Date();
        let fechaFin = new Date();

        if (fInicio && fFin) {
            // Priority: Custom Range
            const [ yi, mi, di ] = fInicio.split('-').map(Number);
            fechaInicio = new Date(yi, mi - 1, di, 0, 0, 0, 0);

            const [ yf, mf, df ] = fFin.split('-').map(Number);
            fechaFin = new Date(yf, mf - 1, df, 23, 59, 59, 999);
        } else if (fecha) {
            const [ y, m, d ] = fecha.split('-').map(Number);
            fechaInicio = new Date(y, m - 1, d, 0, 0, 0, 0);
            fechaFin = new Date(y, m - 1, d, 23, 59, 59, 999);
        } else {
            // Default Period Logic
            if (periodo === 'diario') {
                fechaInicio.setHours(0, 0, 0, 0);
                fechaFin = new Date(fechaInicio);
                fechaFin.setHours(23, 59, 59, 999);
            } else if (periodo === 'semanal') {
                const day = fechaInicio.getDay();
                const diff = fechaInicio.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                fechaInicio.setDate(diff);
                fechaFin.setDate(fechaInicio.getDate() + 7);
                fechaInicio.setHours(0,0,0,0);
                fechaFin.setHours(23,59,59,999);
            } else if (periodo === 'mensual') {
                fechaInicio.setDate(1);
                fechaInicio.setHours(0, 0, 0, 0);
                fechaFin = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0);
                fechaFin.setHours(23, 59, 59, 999);
            }
        }

        // Consultar ventas en el rango
        const ventas = await prisma.venta.findMany({
            where: {
                fecha: {
                    gte: fechaInicio,
                    lte: fechaFin
                },
                estado: 'completada'
            },
            include: {
                detalles: true
            }
        });

        // Calcular totales
        const totalVentas = ventas.length;
        const totalEfectivo = ventas
            .filter(v => v.metodoPago === 'efectivo' || v.metodoPago === 'mixto') // Asumiendo mixto como efectivo para simplificar o requerir lógica más compleja
            .reduce((acc, curr) => acc + parseFloat(curr.total), 0);
        
        const totalQR = ventas
            .filter(v => v.metodoPago === 'qr')
            .reduce((acc, curr) => acc + parseFloat(curr.total), 0);
            
        const totalBruto = ventas.reduce((acc, curr) => acc + parseFloat(curr.total), 0);

        // Agrupar por fecha para el gráfico
        const ventasPorFecha = ventas.reduce((acc, venta) => {
            const fechaKey = venta.fecha.toISOString().split('T')[0];
            if (!acc[fechaKey]) {
                acc[fechaKey] = {
                    fecha: fechaKey,
                    cantidad: 0,
                    total: 0
                };
            }
            acc[fechaKey].cantidad += 1;
            acc[fechaKey].total += parseFloat(venta.total);
            return acc;
        }, {});

        res.json({
            periodo,
            rango: { inicio: fechaInicio, fin: fechaFin },
            totales: {
                cantidadVentas: totalVentas,
                totalEfectivo,
                totalQR,
                totalBruto
            },
            detallePorFecha: Object.values(ventasPorFecha).sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte de ventas' });
    }
};

// Reporte de Ganancia Real (Utilidad)
const getGananciaReal = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        const where = {
            estado: 'completada'
        };

        if (fechaInicio || fechaFin) {
            where.fecha = {};
            if (fechaInicio) {
                const [ y, m, d ] = fechaInicio.split('-').map(Number);
                where.fecha.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
            }
            if (fechaFin) {
                const [ y, m, d ] = fechaFin.split('-').map(Number);
                where.fecha.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
            }
        }

        const ventas = await prisma.venta.findMany({
            where,
            include: {
                detalles: {
                    include: {
                        producto: true
                    }
                }
            }
        });

        let totalVenta = 0;
        let costoTotal = 0;
        let gananciaTotal = 0;
        
        const detallesUtilidad = [];

        ventas.forEach(venta => {
            venta.detalles.forEach(detalle => {
                const precioVenta = parseFloat(detalle.precioUnitario);
                const precioCompra = parseFloat(detalle.precioCompra); // Costo histórico
                const cantidad = detalle.cantidad;

                const subtotalVenta = precioVenta * cantidad;
                const subtotalCosto = precioCompra * cantidad;
                const ganancia = subtotalVenta - subtotalCosto;

                totalVenta += subtotalVenta;
                costoTotal += subtotalCosto;
                gananciaTotal += ganancia;

                // Solo agregar detalles significativos o agrupar si es necesario
                // Aquí podríamos agrupar por producto si el usuario lo pide
            });
        });

        res.json({
            periodo: { fechaInicio, fechaFin },
            resumen: {
                ventaTotal: totalVenta,
                costoTotal: costoTotal,
                utilidadBruta: gananciaTotal,
                margen: totalVenta > 0 ? ((gananciaTotal / totalVenta) * 100).toFixed(2) + '%' : '0%'
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte de utilidad' });
    }
};

// Reporte de Ventas por Método de Pago
const getVentasPorMetodoPago = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        const where = { estado: 'completada' };
        
        if (fechaInicio || fechaFin) {
            where.fecha = {};
            if (fechaInicio) {
               const [ y, m, d ] = fechaInicio.split('-').map(Number);
               where.fecha.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
            }
            if (fechaFin) {
                const [ y, m, d ] = fechaFin.split('-').map(Number);
                where.fecha.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
            }
        }

        const ventas = await prisma.venta.groupBy({
            by: ['metodoPago'],
            _sum: {
                total: true
            },
            _count: {
                id: true
            },
            where
        });

        const reporte = ventas.map(v => ({
            metodoPago: v.metodoPago,
            cantidad: v._count.id,
            total: parseFloat(v._sum.total || 0)
        }));

        res.json({
            data: reporte
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte por método de pago' });
    }
};

// Reporte de Inventario Valorado
const getInventarioValorado = async (req, res) => {
    try {
        const { sucursalId } = req.query;

        const where = {};
        if (sucursalId) {
            // Buscar almacenes de la sucursal
            const almacenes = await prisma.almacen.findMany({
                where: { sucursalId: parseInt(sucursalId) },
                select: { id: true }
            });
            const almacenIds = almacenes.map(a => a.id);
            where.almacenId = { in: almacenIds };
        }

        const inventarios = await prisma.inventario.findMany({
            where,
            include: {
                producto: {
                    include: {
                        categoria: true
                    }
                },
                almacen: {
                    include: {
                        sucursal: true
                    }
                }
            }
        });

        let totalValorado = 0;
        let totalItems = 0;

        const detalle = inventarios.map(inv => {
            const cantidad = parseFloat(inv.cantidad);
            const precioCompra = parseFloat(inv.producto.precioCompra || 0);
            const subtotal = cantidad * precioCompra;

            totalValorado += subtotal;
            totalItems += cantidad;

            return {
                producto: inv.producto.nombre,
                codigoBarras: inv.producto.codigoBarras,
                categoria: inv.producto.categoria?.nombre || 'Sin Categoría',
                almacen: inv.almacen.nombre,
                sucursal: inv.almacen.sucursal.nombre,
                cantidad,
                costoUnitario: precioCompra,
                valorTotal: subtotal
            };
        });

        res.json({
            resumen: {
                totalProductos: detalle.length,
                totalUnidades: totalItems,
                valorTotalInventario: totalValorado
            },
            detalle
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte de inventario valorado' });
    }
};

// Reporte de Rotación de Inventario (Productos "Hueso")
// Productos que no se han vendido en los últimos X días
const getProductosSinMovimiento = async (req, res) => {
    try {
        const { dias = 90 } = req.query;
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));

        // Buscar productos que NO tienen detalles de venta en el periodo
        const productosHueso = await prisma.producto.findMany({
            where: {
                detallesVenta: {
                    none: {
                        venta: {
                            fecha: {
                                gte: fechaLimite
                            }
                        }
                    }
                },
                stock: {
                    gt: 0 // Solo productos que tienen stock
                }
            },
            include: {
                categoria: true,
                inventarios: {
                    include: {
                        almacen: true
                    }
                }
            }
        });

        const data = productosHueso.map(p => ({
            id: p.id,
            nombre: p.nombre,
            codigoBarras: p.codigoBarras,
            categoria: p.categoria?.nombre || 'Sin Categoría',
            stockTotal: parseInt(p.stockActual || p.stock || 0),
            precioVenta: parseFloat(p.precioVenta),
            costo: parseFloat(p.precioCompra),
            ultimaVenta: 'Más de ' + dias + ' días'
        }));

        res.json({
            diasSinVenta: dias,
            cantidadProductos: data.length,
            productos: data
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte de rotación' });
    }
};

// Kardex Detallado de Producto
const getKardexProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { fechaInicio, fechaFin } = req.query;

        const where = {
            productoId: parseInt(id)
        };

        if (fechaInicio || fechaFin) {
            where.createdAt = {};
            if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
            if (fechaFin) {
                const fin = new Date(fechaFin);
                fin.setHours(23, 59, 59, 999);
                where.createdAt.lte = fin;
            }
        }

        const movimientos = await prisma.movimientoInventario.findMany({
            where,
            include: {
                almacen: {
                    include: {
                        sucursal: true
                    }
                },
                usuario: {
                    select: {
                        nombres: true,
                        email: true
                    }
                },
                producto: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const producto = await prisma.producto.findUnique({
            where: { id: parseInt(id) },
            select: { nombre: true, codigoBarras: true, stockActual: true }
        });

        const formattedMovimientos = movimientos.map(m => ({
            id: m.id,
            fecha: m.createdAt,
            tipo: m.tipo, // ENTRADA, SALIDA, AJUSTE
            cantidad: parseFloat(m.cantidad),
            motivo: m.motivo,
            referencia: m.referencia, // ID venta o compra
            almacen: m.almacen.nombre,
            sucursal: m.almacen.sucursal.nombre,
            usuario: m.usuario?.nombres || m.usuario?.email || 'Sistema'
        }));

        res.json({
            producto,
            movimientos: formattedMovimientos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo kardex' });
    }
};

// Reporte de Inteligencia de Negocio: Top Ventas por Categoría
const getTopVentasCategorias = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;        
        const where = {};

        if (fechaInicio || fechaFin) {
            where.fecha = {};
            if (fechaInicio) {
                const [ y, m, d ] = fechaInicio.split('-').map(Number);
                where.fecha.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
            }
            if (fechaFin) {
                const [ y, m, d ] = fechaFin.split('-').map(Number);
                where.fecha.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
            }
        }

        // Obtener detalles de ventas en el periodo
        const detalles = await prisma.detalleVenta.findMany({
            where: {
                venta: {
                    ...where,
                    estado: 'completada'
                }
            },
            include: {
                producto: {
                    include: {
                        categoria: true
                    }
                }
            }
        });

        // Agrupar por categoría
        const agrupado = detalles.reduce((acc, curr) => {
            const catNombre = curr.producto.categoria?.nombre || 'Sin Categoría';
            if (!acc[catNombre]) {
                acc[catNombre] = { nombre: catNombre, cantidad: 0, total: 0 };
            }
            acc[catNombre].cantidad += curr.cantidad;
            acc[catNombre].total += parseFloat(curr.subtotal);
            return acc;
        }, {});

        const reporte = Object.values(agrupado).sort((a, b) => b.total - a.total);

        res.json({
            periodo: { fechaInicio, fechaFin },
            data: reporte
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte de categorías' });
    }
};

// Reporte de Análisis de Tallas (Heatmap)
const getAnalisisTallas = async (req, res) => {
    try {
        // Analizamos todo el histórico o filtramos por fecha si se envía
        const { fechaInicio, fechaFin } = req.query;
        const where = {};

        if (fechaInicio || fechaFin) {
            where.fecha = {};
            if (fechaInicio) {
                const [ y, m, d ] = fechaInicio.split('-').map(Number);
                where.fecha.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
            }
            if (fechaFin) {
                const [ y, m, d ] = fechaFin.split('-').map(Number);
                where.fecha.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
            }
        }

        const detalles = await prisma.detalleVenta.findMany({
            where: {
                venta: {
                    ...where,
                    estado: 'completada'
                }
            },
            include: {
                producto: {
                    select: { talla: true }
                }
            }
        });

        // Agrupar por talla
        // Nota: Si la talla es "38, 39", se contará como ese string entero por ahora.
        // Idealmente el producto debería ser variante única.
        const agrupado = detalles.reduce((acc, curr) => {
            let talla = curr.producto.talla || 'Sin Talla';
            talla = talla.trim();
            
            if (!acc[talla]) {
                acc[talla] = { talla, cantidad: 0, total: 0 };
            }
            acc[talla].cantidad += curr.cantidad;
            acc[talla].total += parseFloat(curr.subtotal);
            return acc;
        }, {});

        const reporte = Object.values(agrupado).sort((a, b) => b.cantidad - a.cantidad); // Top cantidad vendida

        res.json({
            periodo: { fechaInicio, fechaFin },
            data: reporte
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando análisis de tallas' });
    }
};

// Reporte de Cajas (Arqueos / Movimientos)
const getReporteCajas = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, usuarioId, cajaId } = req.query;
        const where = {};

        // Filtros
        if (fechaInicio || fechaFin) {
            where.fechaInicio = {};
            if (fechaInicio) {
                 const [ y, m, d ] = fechaInicio.split('-').map(Number);
                 where.fechaInicio.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
            }
            if (fechaFin) {
                const [ y, m, d ] = fechaFin.split('-').map(Number);
                where.fechaInicio.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
            }
        }
        if (usuarioId) where.usuarioId = parseInt(usuarioId);
        if (cajaId) where.cajaId = parseInt(cajaId);

        // Obtener sesiones de caja
        const sesiones = await prisma.sesionCaja.findMany({
            where,
            include: {
                usuario: { select: { nombres: true, email: true } },
                caja: { select: { nombre: true, sucursal: { select: { nombre: true } } } },
                ventas: {
                    where: { estado: 'completada' },
                    select: { metodoPago: true, total: true }
                },
                movimientos: {
                    select: { tipo: true, monto: true, motivo: true }
                }
            },
            orderBy: { fechaInicio: 'desc' },
            take: 50 // Límite inicial
        });

        // Procesar datos para el reporte
        const reporte = sesiones.map(sesion => {
            // Totales de ventas
            const ventasEfectivo = sesion.ventas
                .filter(v => v.metodoPago === 'efectivo')
                .reduce((sum, v) => sum + parseFloat(v.total), 0);
            
            const ventasQR = sesion.ventas
                .filter(v => v.metodoPago === 'qr')
                .reduce((sum, v) => sum + parseFloat(v.total), 0);

            // Movimientos manuales (Excluir ventas antiguas que se guardaron como INGRESO)
            const ingresos = sesion.movimientos
                .filter(m => m.tipo === 'INGRESO' && (!m.motivo || !m.motivo.startsWith('Venta')))
                .reduce((sum, m) => sum + parseFloat(m.monto), 0);

            const retiros = sesion.movimientos
                .filter(m => m.tipo === 'RETIRO')
                .reduce((sum, m) => sum + parseFloat(m.monto), 0);

            return {
                id: sesion.id,
                fechaApertura: sesion.fechaInicio,
                fechaCierre: sesion.fechaFin,
                estado: sesion.estado,
                caja: sesion.caja.nombre,
                sucursal: sesion.caja.sucursal.nombre,
                usuario: sesion.usuario.nombres || sesion.usuario.email,
                montoInicial: parseFloat(sesion.montoInicial),
                ventasEfectivo,
                ventasQR,
                ingresos,
                retiros,
                totalVendido: ventasEfectivo + ventasQR,
                montoFinal: sesion.montoFinal ? parseFloat(sesion.montoFinal) : null,
                // Saldo teórico en efectivo = Inicial + VentasEfvo + Ingresos - Retiros
                saldoTeorico: parseFloat(sesion.montoInicial) + ventasEfectivo + ingresos - retiros
            };
        });

        res.json({ data: reporte });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte de cajas' });
    }
};

export { 
    getVentasPorPeriodo, 
    getGananciaReal, 
    getVentasPorMetodoPago,
    getInventarioValorado,
    getProductosSinMovimiento,
    getKardexProducto,
    getTopVentasCategorias,
    getAnalisisTallas,
    getReporteCajas
};
