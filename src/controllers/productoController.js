import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todos los productos
const getProductos = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, categoriaId, sucursalId, almacenId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            ...(search && { nombre: { contains: search } }),
            ...(categoriaId && { categoriaId: parseInt(categoriaId) }),
            ...(sucursalId && { sucursalId: parseInt(sucursalId) }),
            ...(almacenId && { almacenId: parseInt(almacenId) })
        };

        const [total, productos] = await prisma.$transaction([
            prisma.producto.count({ where }),
            prisma.producto.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: { 
                    categoria: true,
                    sucursal: true,
                    almacen: true
                },
                orderBy: { nombre: 'asc' }
            })
        ]);

        res.json({
            data: productos,
            meta: {
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo productos' });
    }
};

// Obtener producto por ID
const getProductoById = async (req, res) => {
    const { id } = req.params;
    try {
        const producto = await prisma.producto.findUnique({
            where: { id: parseInt(id) },
            include: { 
                categoria: true, 
                sucursal: true,
                almacen: true,
                inventarios: { include: { almacen: true } } 
            }
        });
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo producto' });
    }
};

// Crear producto
const createProducto = async (req, res) => {
    const {
        nombre, categoriaId, sucursalId, almacenId, talla, color, 
        precioCompra, precioVenta, codigoBarras, codigoInterno, stock, stockMinimo
    } = req.body;

    try {
        const producto = await prisma.producto.create({
            data: {
                nombre,
                categoriaId: parseInt(categoriaId),
                sucursalId: parseInt(sucursalId),
                almacenId: parseInt(almacenId),
                talla,
                color,
                precioCompra: parseFloat(precioCompra) || 0,
                precioVenta: parseFloat(precioVenta) || 0,
                codigoBarras,
                codigoInterno,
                stock: parseInt(stock) || 0,
                stockMinimo: parseInt(stockMinimo) || 0
            },
            include: { categoria: true, sucursal: true, almacen: true }
        });
        res.status(201).json(producto);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El código de barras ya existe' });
        }
        res.status(500).json({ error: 'Error creando producto' });
    }
};

// Actualizar producto
const updateProducto = async (req, res) => {
    const { id } = req.params;
    const {
        nombre, categoriaId, sucursalId, almacenId, talla, color,
        precioCompra, precioVenta, codigoBarras, codigoInterno, stock, stockMinimo
    } = req.body;

    try {
        const producto = await prisma.producto.update({
            where: { id: parseInt(id) },
            data: {
                nombre,
                categoriaId: categoriaId ? parseInt(categoriaId) : undefined,
                sucursalId: sucursalId ? parseInt(sucursalId) : undefined,
                almacenId: almacenId ? parseInt(almacenId) : undefined,
                talla,
                color,
                precioCompra: precioCompra ? parseFloat(precioCompra) : undefined,
                precioVenta: precioVenta ? parseFloat(precioVenta) : undefined,
                codigoBarras,
                codigoInterno,
                stock: stock !== undefined ? parseInt(stock) : undefined,
                stockMinimo: stockMinimo ? parseInt(stockMinimo) : undefined
            },
            include: { categoria: true, sucursal: true, almacen: true }
        });
        res.json(producto);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.status(500).json({ error: 'Error actualizando producto' });
    }
};

// Eliminar producto
const deleteProducto = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.producto.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'No se puede eliminar, tiene ventas asociadas' });
        }
        res.status(500).json({ error: 'Error eliminando producto' });
    }
};

// Buscar por código de barras
const getProductoByBarcode = async (req, res) => {
    const { codigo } = req.params;
    try {
        const producto = await prisma.producto.findFirst({
            where: {
                OR: [
                    { codigoBarras: codigo },
                    { codigoInterno: codigo }
                ]
            },
            include: { categoria: true, sucursal: true, almacen: true }
        });
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error buscando producto' });
    }
};

export { getProductos, getProductoById, createProducto, updateProducto, deleteProducto, getProductoByBarcode };
