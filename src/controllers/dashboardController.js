import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener estadísticas del dashboard
const getStats = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        let whereSucursal = {};

        // Filtro de sucursal
        if (req.user.tipo !== 'administrador') {
            if (!req.user.sucursalId) {
                return res.json({
                    totalVentas: 0,
                    productosVendidos: 0,
                    ganancias: 0,
                    cambioVentas: 0,
                    cambioProductos: 0,
                    cambioGanancias: 0,
                    ventasPorMes: Array(12).fill(0),
                    topProductosCantidad: [],
                    topProductosMonto: []
                });
            }
            whereSucursal = { sucursalId: req.user.sucursalId };
        }

        // Construir filtro de fechas actual
        const dateFilter = {};
        if (fechaInicio || fechaFin) {
            dateFilter.fecha = {};
            if (fechaInicio) dateFilter.fecha.gte = new Date(fechaInicio);
            if (fechaFin) {
                const endDate = new Date(fechaFin);
                endDate.setDate(endDate.getDate() + 1);
                dateFilter.fecha.lt = endDate;
            }
        }

        // Construir filtro de fechas anterior para comparación
        const periodoAnteriorFilter = {};
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            const duracion = fin.getTime() - inicio.getTime();
            const inicioAnterior = new Date(inicio.getTime() - duracion);
            periodoAnteriorFilter.fecha = {
                gte: inicioAnterior,
                lt: inicio
            };
        }

        const whereBase = {
            estado: 'completada',
            ...whereSucursal
        };

        // 1. Obtener datos actuales
        const ventasActuales = await prisma.venta.findMany({
            where: { ...whereBase, ...dateFilter },
            include: {
                detalles: { include: { producto: true } }
            }
        });

        const totalVentas = ventasActuales.reduce((sum, v) => sum + parseFloat(v.total), 0);
        
        const productosVendidos = ventasActuales.reduce((sum, venta) => {
            return sum + venta.detalles.reduce((s, d) => s + d.cantidad, 0);
        }, 0);

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

        // 2. Obtener datos anteriores para comparación
        let cambioVentas = 0, cambioProductos = 0, cambioGanancias = 0;

        if (periodoAnteriorFilter.fecha) {
            const ventasAnteriores = await prisma.venta.findMany({
                where: { ...whereBase, ...periodoAnteriorFilter },
                include: { detalles: { include: { producto: true } } }
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

            cambioVentas = totalVentasAnterior > 0 ? ((totalVentas - totalVentasAnterior) / totalVentasAnterior) * 100 : 0;
            cambioProductos = productosVendidosAnterior > 0 ? ((productosVendidos - productosVendidosAnterior) / productosVendidosAnterior) * 100 : 0;
            cambioGanancias = gananciasAnterior > 0 ? ((ganancias - gananciasAnterior) / gananciasAnterior) * 100 : 0;
        }

        // 3. Ventas por mes (últimos 12 meses o filtro)
        const ventasPorMes = Array(12).fill(0);
        
        // Si no hay filtro de fecha específico, traemos datos de los últimos 12 meses
        if (!fechaInicio && !fechaFin) {
            const hoy = new Date();
            const hace12Meses = new Date(hoy.getFullYear(), 0, 1); // Desde inicio de año
            
            const ventasAnuales = await prisma.venta.findMany({
                where: {
                    ...whereBase,
                    fecha: { gte: hace12Meses }
                }
            });
            
            ventasAnuales.forEach(venta => {
                const mesIndex = new Date(venta.fecha).getMonth();
                ventasPorMes[mesIndex] += parseFloat(venta.total);
            });
        } else {
            // Si hay filtro, usamos las ventas actuales ya cargadas
            ventasActuales.forEach(venta => {
                const mesIndex = new Date(venta.fecha).getMonth();
                ventasPorMes[mesIndex] += parseFloat(venta.total);
            });
        }

        // 4. Top productos
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
        const topProductosCantidad = [...productosArray].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
        const topProductosMonto = [...productosArray].sort((a, b) => b.monto - a.monto).slice(0, 5);

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
