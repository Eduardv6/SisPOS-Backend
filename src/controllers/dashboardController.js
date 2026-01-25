import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener estadísticas del dashboard
const getStats = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        // Construir filtro de fechas
        const dateFilter = {};
        if (fechaInicio || fechaFin) {
            dateFilter.fecha = {};
            if (fechaInicio) {
                dateFilter.fecha.gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                const endDate = new Date(fechaFin);
                endDate.setDate(endDate.getDate() + 1);
                dateFilter.fecha.lt = endDate;
            }
        }

        // Calcular período anterior para comparación
        let periodoAnteriorFilter = {};
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            const duracion = fin.getTime() - inicio.getTime();
            const inicioAnterior = new Date(inicio.getTime() - duracion);
            periodoAnteriorFilter = {
                fecha: {
                    gte: inicioAnterior,
                    lt: inicio
                }
            };
        }

        // 1. Total de ventas del período actual
        const ventasActuales = await prisma.venta.findMany({
            where: {
                ...dateFilter,
                estado: 'completada'
            },
            include: {
                detalles: {
                    include: {
                        producto: true
                    }
                }
            }
        });

        const totalVentas = ventasActuales.reduce((sum, v) => sum + parseFloat(v.total), 0);

        // 2. Productos vendidos
        const productosVendidos = ventasActuales.reduce((sum, venta) => {
            return sum + venta.detalles.reduce((s, d) => s + d.cantidad, 0);
        }, 0);

        // 3. Ganancias (diferencia entre precio venta y precio compra)
        let ganancias = 0;
        for (const venta of ventasActuales) {
            for (const detalle of venta.detalles) {
                if (detalle.producto) {
                    const precioVenta = parseFloat(detalle.precioUnitario);
                    const precioCompra = parseFloat(detalle.producto.precioCompra);
                    ganancias += (precioVenta - precioCompra) * detalle.cantidad;
                }
            }
        }

        // 4. Calcular cambios porcentuales si hay período anterior
        let cambioVentas = 0;
        let cambioProductos = 0;
        let cambioGanancias = 0;

        if (Object.keys(periodoAnteriorFilter).length > 0) {
            const ventasAnteriores = await prisma.venta.findMany({
                where: {
                    ...periodoAnteriorFilter,
                    estado: 'completada'
                },
                include: {
                    detalles: {
                        include: {
                            producto: true
                        }
                    }
                }
            });

            const totalVentasAnterior = ventasAnteriores.reduce((sum, v) => sum + parseFloat(v.total), 0);
            const productosVendidosAnterior = ventasAnteriores.reduce((sum, venta) => {
                return sum + venta.detalles.reduce((s, d) => s + d.cantidad, 0);
            }, 0);

            let gananciasAnterior = 0;
            for (const venta of ventasAnteriores) {
                for (const detalle of venta.detalles) {
                    if (detalle.producto) {
                        const precioVenta = parseFloat(detalle.precioUnitario);
                        const precioCompra = parseFloat(detalle.producto.precioCompra);
                        gananciasAnterior += (precioVenta - precioCompra) * detalle.cantidad;
                    }
                }
            }

            // Calcular porcentajes de cambio
            cambioVentas = totalVentasAnterior > 0
                ? ((totalVentas - totalVentasAnterior) / totalVentasAnterior) * 100
                : 0;
            cambioProductos = productosVendidosAnterior > 0
                ? ((productosVendidos - productosVendidosAnterior) / productosVendidosAnterior) * 100
                : 0;
            cambioGanancias = gananciasAnterior > 0
                ? ((ganancias - gananciasAnterior) / gananciasAnterior) * 100
                : 0;
        }

        // 5. Ventas por mes (últimos 12 meses)
        const ahora = new Date();
        const hace12Meses = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);

        const ventasMensuales = await prisma.venta.groupBy({
            by: ['fecha'],
            where: {
                fecha: { gte: hace12Meses },
                estado: 'completada'
            },
            _sum: { total: true }
        });

        // Agrupar por mes
        const ventasPorMes = Array(12).fill(0);
        ventasActuales.forEach(venta => {
            const mesIndex = new Date(venta.fecha).getMonth();
            ventasPorMes[mesIndex] += parseFloat(venta.total);
        });

        // Si hay filtro de fechas, recalcular ventasPorMes basado en todas las ventas del año
        if (!fechaInicio && !fechaFin) {
            const ventasAnuales = await prisma.venta.findMany({
                where: {
                    fecha: { gte: hace12Meses },
                    estado: 'completada'
                }
            });
            ventasPorMes.fill(0);
            ventasAnuales.forEach(venta => {
                const mesIndex = new Date(venta.fecha).getMonth();
                ventasPorMes[mesIndex] += parseFloat(venta.total);
            });
        }

        // 6. Top productos por cantidad
        const productosAgrupados = {};
        for (const venta of ventasActuales) {
            for (const detalle of venta.detalles) {
                const prodId = detalle.productoId;
                if (!productosAgrupados[prodId]) {
                    productosAgrupados[prodId] = {
                        id: prodId,
                        nombre: detalle.producto?.nombre || 'Producto',
                        cantidad: 0,
                        monto: 0
                    };
                }
                productosAgrupados[prodId].cantidad += detalle.cantidad;
                productosAgrupados[prodId].monto += parseFloat(detalle.subtotal);
            }
        }

        const productosArray = Object.values(productosAgrupados);

        const topProductosCantidad = [...productosArray]
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5)
            .map(({ id, nombre, cantidad }) => ({ id, nombre, cantidad }));

        const topProductosMonto = [...productosArray]
            .sort((a, b) => b.monto - a.monto)
            .slice(0, 5)
            .map(({ id, nombre, monto }) => ({ id, nombre, monto: Math.round(monto * 100) / 100 }));

        res.json({
            totalVentas: Math.round(totalVentas * 100) / 100,
            productosVendidos,
            ganancias: Math.round(ganancias * 100) / 100,
            cambioVentas: Math.round(cambioVentas * 10) / 10,
            cambioProductos: Math.round(cambioProductos * 10) / 10,
            cambioGanancias: Math.round(cambioGanancias * 10) / 10,
            ventasPorMes: ventasPorMes.map(v => Math.round(v * 100) / 100),
            topProductosCantidad,
            topProductosMonto
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas del dashboard' });
    }
};

export { getStats };
