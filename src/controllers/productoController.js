import { PrismaClient } from "@prisma/client";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const prisma = new PrismaClient();

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads/productos');
        // Crear directorio si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generar nombre único: timestamp + nombre original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'producto-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Solo permitir imágenes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// Obtener todos los productos
const getProductos = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, categoriaId, sucursalId, almacenId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let where = {
            ...(search && { nombre: { contains: search } }),
            ...(categoriaId && { categoriaId: parseInt(categoriaId) }),
            ...(almacenId && { almacenId: parseInt(almacenId) })
        };

        // Lógica de permisos de sucursal
        if (req.user.tipo === 'administrador') {
            // Admin puede filtrar por sucursal si quiere
            if (sucursalId) where.sucursalId = parseInt(sucursalId);
        } else {
            // Supervisor y Cajero SOLO ven su sucursal
            if (!req.user.sucursalId) {
                // Si no tiene sucursal asignada, retornar vacío
                return res.json({
                    data: [],
                    meta: { total: 0, totalPages: 0, currentPage: parseInt(page), itemsPerPage: parseInt(limit) }
                }); 
            }
            where.sucursalId = req.user.sucursalId;
        }

        const [total, productos] = await prisma.$transaction([
            prisma.producto.count({ where }),
            prisma.producto.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: { 
                    categoria: true,
                    sucursal: true,
                    almacen: true,
                    inventarios: true
                },
                orderBy: { nombre: 'asc' }
            })
        ]);

        // Calcular stock dinámicamente desde inventarios
        const productosConStock = productos.map(producto => {
            const stockTotal = producto.inventarios.reduce((sum, inv) => {
                return sum + parseFloat(inv.cantidad);
            }, 0);
            
            const { inventarios, ...productoData } = producto;
            return {
                ...productoData,
                stock: stockTotal
            };
        });

        res.json({
            data: productosConStock,
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
        
        // Calcular stock total desde inventarios
        const stockTotal = producto.inventarios.reduce((sum, inv) => {
            return sum + parseFloat(inv.cantidad);
        }, 0);
        
        res.json({
            ...producto,
            stock: stockTotal
        });
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

    // Obtener URL de la imagen si se subió
    const imagen = req.file ? `/uploads/productos/${req.file.filename}` : null;

    try {
        // Usar transacción para crear producto e inventario inicial
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Crear el producto
            const producto = await tx.producto.create({
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
                    stockMinimo: parseInt(stockMinimo) || 0,
                    imagen // Guardar URL de la imagen
                },
                include: { categoria: true, sucursal: true, almacen: true }
            });

            // 2. Si se especificó stock inicial, crear registro en Inventario
            const stockInicial = parseInt(stock) || 0;
            if (stockInicial > 0 && almacenId) {
                await tx.inventario.create({
                    data: {
                        productoId: producto.id,
                        almacenId: parseInt(almacenId),
                        cantidad: stockInicial,
                        ubicacionFisica: 'N/A'
                    }
                });

                // 3. Registrar movimiento de inventario inicial
                await tx.movimientoInventario.create({
                    data: {
                        productoId: producto.id,
                        almacenId: parseInt(almacenId),
                        tipo: 'ENTRADA',
                        cantidad: stockInicial,
                        motivo: 'Stock inicial al crear producto'
                    }
                });
            }

            return producto;
        });

        res.status(201).json(resultado);
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

    // Obtener URL de la imagen si se subió una nueva
    const imagen = req.file ? `/uploads/productos/${req.file.filename}` : undefined;

    try {
        // Advertencia si se intenta actualizar el stock directamente
        if (stock !== undefined) {
            console.warn('⚠️ Intento de actualizar stock directamente. Use el módulo de inventario para ajustar stock.');
        }

        // Si hay una nueva imagen, eliminar la anterior
        if (imagen) {
            const productoActual = await prisma.producto.findUnique({
                where: { id: parseInt(id) },
                select: { imagen: true }
            });
            
            if (productoActual?.imagen) {
                const imagenAnterior = path.join(__dirname, '../../', productoActual.imagen);
                if (fs.existsSync(imagenAnterior)) {
                    fs.unlinkSync(imagenAnterior);
                }
            }
        }

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
                stockMinimo: stockMinimo ? parseInt(stockMinimo) : undefined,
                ...(imagen && { imagen }) // Solo actualizar imagen si se subió una nueva
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
            include: { 
                categoria: true, 
                sucursal: true, 
                almacen: true,
                inventarios: true
            }
        });
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Calcular stock total desde inventarios
        const stockTotal = producto.inventarios.reduce((sum, inv) => {
            return sum + parseFloat(inv.cantidad);
        }, 0);
        
        res.json({
            ...producto,
            stock: stockTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error buscando producto' });
    }
};

export { getProductos, getProductoById, createProducto, updateProducto, deleteProducto, getProductoByBarcode, upload };
