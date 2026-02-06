import { PrismaClient } from "@prisma/client";
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

// Exportar todas las tablas a un archivo Excel
const exportToExcel = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SisPOS';
        workbook.created = new Date();

        // ==================== SUCURSALES ====================
        const sucursales = await prisma.sucursal.findMany();
        const sucursalesSheet = workbook.addWorksheet('Sucursales');
        sucursalesSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Dirección', key: 'direccion', width: 40 },
            { header: 'Creado', key: 'createdAt', width: 20 },
        ];
        sucursales.forEach(row => sucursalesSheet.addRow(row));
        styleHeader(sucursalesSheet);

        // ==================== CAJAS ====================
        const cajas = await prisma.caja.findMany({ include: { sucursal: true } });
        const cajasSheet = workbook.addWorksheet('Cajas');
        cajasSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 25 },
            { header: 'Sucursal', key: 'sucursal', width: 25 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Saldo Inicial', key: 'saldoInicial', width: 15 },
            { header: 'Saldo Actual', key: 'saldoActual', width: 15 },
        ];
        cajas.forEach(row => cajasSheet.addRow({
            ...row,
            sucursal: row.sucursal?.nombre || '',
            saldoInicial: parseFloat(row.saldoInicial),
            saldoActual: parseFloat(row.saldoActual),
        }));
        styleHeader(cajasSheet);

        // ==================== USUARIOS ====================
        const usuarios = await prisma.usuario.findMany({
            select: {
                id: true,
                nombres: true,
                email: true,
                nroDoc: true,
                telefono: true,
                tipo: true,
                estado: true,
                sucursal: { select: { nombre: true } },
                createdAt: true
            }
        });
        const usuariosSheet = workbook.addWorksheet('Usuarios');
        usuariosSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombres', key: 'nombres', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Nro. Documento', key: 'nroDoc', width: 15 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Tipo', key: 'tipo', width: 15 },
            { header: 'Estado', key: 'estado', width: 10 },
            { header: 'Sucursal', key: 'sucursal', width: 25 },
        ];
        usuarios.forEach(row => usuariosSheet.addRow({
            ...row,
            sucursal: row.sucursal?.nombre || '',
            estado: row.estado ? 'Activo' : 'Inactivo',
        }));
        styleHeader(usuariosSheet);

        // ==================== CATEGORÍAS ====================
        const categorias = await prisma.categoria.findMany();
        const categoriasSheet = workbook.addWorksheet('Categorías');
        categoriasSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Activa', key: 'activa', width: 10 },
        ];
        categorias.forEach(row => categoriasSheet.addRow({
            ...row,
            activa: row.activa ? 'Sí' : 'No',
        }));
        styleHeader(categoriasSheet);

        // ==================== ALMACENES ====================
        const almacenes = await prisma.almacen.findMany({ include: { sucursal: true } });
        const almacenesSheet = workbook.addWorksheet('Almacenes');
        almacenesSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Sucursal', key: 'sucursal', width: 25 },
            { header: 'Ubicación', key: 'ubicacion', width: 40 },
        ];
        almacenes.forEach(row => almacenesSheet.addRow({
            ...row,
            sucursal: row.sucursal?.nombre || '',
        }));
        styleHeader(almacenesSheet);

        // ==================== PRODUCTOS ====================
        const productos = await prisma.producto.findMany({
            include: { categoria: true, sucursal: true, almacen: true }
        });
        const productosSheet = workbook.addWorksheet('Productos');
        productosSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 35 },
            { header: 'Categoría', key: 'categoria', width: 20 },
            { header: 'Sucursal', key: 'sucursal', width: 20 },
            { header: 'Almacén', key: 'almacen', width: 20 },
            { header: 'Talla', key: 'talla', width: 15 },
            { header: 'Color', key: 'color', width: 15 },
            { header: 'Precio Compra', key: 'precioCompra', width: 15 },
            { header: 'Precio Venta', key: 'precioVenta', width: 15 },
            { header: 'Código Barras', key: 'codigoBarras', width: 20 },
            { header: 'Código Interno', key: 'codigoInterno', width: 20 },
            { header: 'Stock', key: 'stock', width: 10 },
            { header: 'Stock Mínimo', key: 'stockMinimo', width: 12 },
        ];
        productos.forEach(row => productosSheet.addRow({
            ...row,
            categoria: row.categoria?.nombre || '',
            sucursal: row.sucursal?.nombre || '',
            almacen: row.almacen?.nombre || '',
            precioCompra: parseFloat(row.precioCompra),
            precioVenta: parseFloat(row.precioVenta),
        }));
        styleHeader(productosSheet);

        // ==================== CLIENTES ====================
        const clientes = await prisma.cliente.findMany();
        const clientesSheet = workbook.addWorksheet('Clientes');
        clientesSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 35 },
            { header: 'Nro. Documento', key: 'nroDocumento', width: 20 },
            { header: 'Celular', key: 'celular', width: 15 },
            { header: 'Creado', key: 'createdAt', width: 20 },
        ];
        clientes.forEach(row => clientesSheet.addRow(row));
        styleHeader(clientesSheet);

        // ==================== PROVEEDORES ====================
        const proveedores = await prisma.proveedor.findMany();
        const proveedoresSheet = workbook.addWorksheet('Proveedores');
        proveedoresSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre', width: 35 },
            { header: 'Dirección', key: 'direccion', width: 40 },
            { header: 'Celular', key: 'celular', width: 15 },
            { header: 'Contacto', key: 'contacto', width: 25 },
        ];
        proveedores.forEach(row => proveedoresSheet.addRow(row));
        styleHeader(proveedoresSheet);

        // ==================== VENTAS ====================
        const ventas = await prisma.venta.findMany({
            include: { cliente: true, usuario: true, detalles: { include: { producto: true } } }
        });
        const ventasSheet = workbook.addWorksheet('Ventas');
        ventasSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Cliente', key: 'cliente', width: 30 },
            { header: 'Usuario', key: 'usuario', width: 25 },
            { header: 'Tipo Documento', key: 'tipoDocumento', width: 15 },
            { header: 'Nro Documento', key: 'numeroDocumento', width: 20 },
            { header: 'Método Pago', key: 'metodoPago', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Estado', key: 'estado', width: 12 },
        ];
        ventas.forEach(row => ventasSheet.addRow({
            ...row,
            cliente: row.cliente?.nombre || 'Sin cliente',
            usuario: row.usuario?.nombres || '',
            total: parseFloat(row.total),
        }));
        styleHeader(ventasSheet);

        // ==================== DETALLE VENTAS ====================
        const detalleVentasSheet = workbook.addWorksheet('Detalle Ventas');
        detalleVentasSheet.columns = [
            { header: 'ID Venta', key: 'ventaId', width: 10 },
            { header: 'Producto', key: 'producto', width: 35 },
            { header: 'Cantidad', key: 'cantidad', width: 10 },
            { header: 'Precio Unitario', key: 'precioUnitario', width: 15 },
            { header: 'Subtotal', key: 'subtotal', width: 15 },
        ];
        ventas.forEach(venta => {
            venta.detalles.forEach(detalle => {
                detalleVentasSheet.addRow({
                    ventaId: venta.id,
                    producto: detalle.producto?.nombre || '',
                    cantidad: detalle.cantidad,
                    precioUnitario: parseFloat(detalle.precioUnitario),
                    subtotal: parseFloat(detalle.subtotal),
                });
            });
        });
        styleHeader(detalleVentasSheet);

        // ==================== INVENTARIO ====================
        const inventarios = await prisma.inventario.findMany({
            include: { producto: true, almacen: true }
        });
        const inventarioSheet = workbook.addWorksheet('Inventario');
        inventarioSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Producto', key: 'producto', width: 35 },
            { header: 'Almacén', key: 'almacen', width: 25 },
            { header: 'Cantidad', key: 'cantidad', width: 12 },
            { header: 'Ubicación Física', key: 'ubicacionFisica', width: 20 },
        ];
        inventarios.forEach(row => inventarioSheet.addRow({
            ...row,
            producto: row.producto?.nombre || '',
            almacen: row.almacen?.nombre || '',
            cantidad: parseFloat(row.cantidad),
        }));
        styleHeader(inventarioSheet);

        // ==================== SESIONES CAJA ====================
        const sesionesCaja = await prisma.sesionCaja.findMany({
            include: { caja: true, usuario: true }
        });
        const sesionesSheet = workbook.addWorksheet('Sesiones Caja');
        sesionesSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Caja', key: 'caja', width: 20 },
            { header: 'Usuario', key: 'usuario', width: 25 },
            { header: 'Fecha Inicio', key: 'fechaInicio', width: 20 },
            { header: 'Fecha Fin', key: 'fechaFin', width: 20 },
            { header: 'Monto Inicial', key: 'montoInicial', width: 15 },
            { header: 'Monto Final', key: 'montoFinal', width: 15 },
            { header: 'Estado', key: 'estado', width: 12 },
        ];
        sesionesCaja.forEach(row => sesionesSheet.addRow({
            ...row,
            caja: row.caja?.nombre || '',
            usuario: row.usuario?.nombres || '',
            montoInicial: parseFloat(row.montoInicial),
            montoFinal: row.montoFinal ? parseFloat(row.montoFinal) : null,
        }));
        styleHeader(sesionesSheet);

        // Configurar headers de respuesta para descarga
        const filename = `backup_sispos_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Escribir y enviar
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exportando a Excel:', error);
        res.status(500).json({ error: 'Error generando archivo Excel' });
    }
};

// Exportar una tabla específica
const exportTableToExcel = async (req, res) => {
    const { tabla } = req.params;
    const allowedTables = ['productos', 'ventas', 'clientes', 'inventario', 'usuarios', 'proveedores'];

    if (!allowedTables.includes(tabla)) {
        return res.status(400).json({ error: `Tabla no permitida. Tablas disponibles: ${allowedTables.join(', ')}` });
    }

    try {
        const workbook = new ExcelJS.Workbook();
        let data, sheet;

        switch (tabla) {
            case 'productos':
                data = await prisma.producto.findMany({ include: { categoria: true, sucursal: true, almacen: true } });
                sheet = workbook.addWorksheet('Productos');
                sheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Nombre', key: 'nombre', width: 35 },
                    { header: 'Categoría', key: 'categoria', width: 20 },
                    { header: 'Talla', key: 'talla', width: 15 },
                    { header: 'Color', key: 'color', width: 15 },
                    { header: 'Precio Compra', key: 'precioCompra', width: 15 },
                    { header: 'Precio Venta', key: 'precioVenta', width: 15 },
                    { header: 'Código Barras', key: 'codigoBarras', width: 20 },
                    { header: 'Stock', key: 'stock', width: 10 },
                ];
                data.forEach(row => sheet.addRow({
                    ...row,
                    categoria: row.categoria?.nombre || '',
                    precioCompra: parseFloat(row.precioCompra),
                    precioVenta: parseFloat(row.precioVenta),
                }));
                break;

            case 'ventas':
                data = await prisma.venta.findMany({ include: { cliente: true, usuario: true } });
                sheet = workbook.addWorksheet('Ventas');
                sheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Fecha', key: 'fecha', width: 20 },
                    { header: 'Cliente', key: 'cliente', width: 30 },
                    { header: 'Total', key: 'total', width: 15 },
                    { header: 'Estado', key: 'estado', width: 12 },
                ];
                data.forEach(row => sheet.addRow({
                    ...row,
                    cliente: row.cliente?.nombre || 'Sin cliente',
                    total: parseFloat(row.total),
                }));
                break;

            case 'clientes':
                data = await prisma.cliente.findMany();
                sheet = workbook.addWorksheet('Clientes');
                sheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Nombre', key: 'nombre', width: 35 },
                    { header: 'Nro. Documento', key: 'nroDocumento', width: 20 },
                    { header: 'Celular', key: 'celular', width: 15 },
                ];
                data.forEach(row => sheet.addRow(row));
                break;

            case 'inventario':
                data = await prisma.inventario.findMany({ include: { producto: true, almacen: true } });
                sheet = workbook.addWorksheet('Inventario');
                sheet.columns = [
                    { header: 'Producto', key: 'producto', width: 35 },
                    { header: 'Almacén', key: 'almacen', width: 25 },
                    { header: 'Cantidad', key: 'cantidad', width: 12 },
                ];
                data.forEach(row => sheet.addRow({
                    producto: row.producto?.nombre || '',
                    almacen: row.almacen?.nombre || '',
                    cantidad: parseFloat(row.cantidad),
                }));
                break;

            case 'usuarios':
                data = await prisma.usuario.findMany({
                    select: { id: true, nombres: true, email: true, tipo: true, estado: true }
                });
                sheet = workbook.addWorksheet('Usuarios');
                sheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Nombres', key: 'nombres', width: 30 },
                    { header: 'Email', key: 'email', width: 30 },
                    { header: 'Tipo', key: 'tipo', width: 15 },
                    { header: 'Estado', key: 'estado', width: 10 },
                ];
                data.forEach(row => sheet.addRow({
                    ...row,
                    estado: row.estado ? 'Activo' : 'Inactivo',
                }));
                break;

            case 'proveedores':
                data = await prisma.proveedor.findMany();
                sheet = workbook.addWorksheet('Proveedores');
                sheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Nombre', key: 'nombre', width: 35 },
                    { header: 'Dirección', key: 'direccion', width: 40 },
                    { header: 'Celular', key: 'celular', width: 15 },
                ];
                data.forEach(row => sheet.addRow(row));
                break;
        }

        styleHeader(sheet);

        const filename = `${tabla}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(`Error exportando ${tabla}:`, error);
        res.status(500).json({ error: `Error exportando ${tabla}` });
    }
};

// Función para dar estilo a los headers
const styleHeader = (sheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { horizontal: 'center' };
    });
    headerRow.height = 20;
};

// Obtener estadísticas del backup (sin descargar)
const getBackupStats = async (req, res) => {
    try {
        const [
            sucursales,
            cajas,
            usuarios,
            categorias,
            productos,
            clientes,
            proveedores,
            ventas,
            inventarios
        ] = await Promise.all([
            prisma.sucursal.count(),
            prisma.caja.count(),
            prisma.usuario.count(),
            prisma.categoria.count(),
            prisma.producto.count(),
            prisma.cliente.count(),
            prisma.proveedor.count(),
            prisma.venta.count(),
            prisma.inventario.count(),
        ]);

        res.json({
            message: 'Estadísticas del backup',
            tablas: {
                sucursales,
                cajas,
                usuarios,
                categorias,
                productos,
                clientes,
                proveedores,
                ventas,
                inventarios,
            },
            totalRegistros: sucursales + cajas + usuarios + categorias + productos + clientes + proveedores + ventas + inventarios
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
};

export { exportToExcel, exportTableToExcel, getBackupStats };
