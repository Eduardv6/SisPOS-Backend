import { PrismaClient } from "@prisma/client";
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuración de multer con almacenamiento en memoria (para subir a Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Tipo de archivo no permitido. Solo se permiten imágenes."),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
});

// Helper: Subir buffer de imagen a Cloudinary
const uploadToCloudinary = (fileBuffer, folder = 'productos') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' }, // Redimensionar máximo 800x800
          { quality: 'auto', fetch_format: 'auto' },  // Optimizar calidad y formato
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Helper: Extraer public_id de una URL de Cloudinary para poder eliminarla
const getCloudinaryPublicId = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return null;
  try {
    // URL format: https://res.cloudinary.com/cloud/image/upload/v123/folder/filename.ext
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) return null;
    const pathAfterUpload = parts[1]; // v123/folder/filename.ext
    // Quitar la versión (v123/) si existe
    const withoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    // Quitar la extensión del archivo
    const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
};

// Helper: Eliminar imagen de Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  const publicId = getCloudinaryPublicId(imageUrl);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ Imagen eliminada de Cloudinary: ${publicId}`);
    } catch (err) {
      console.error("Error al eliminar imagen de Cloudinary:", err);
    }
  }
};

// Obtener todos los productos
const getProductos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      categoriaId,
      sucursalId,
      almacenId,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {
      activo: true, // Solo mostrar productos activos
      ...(search && { nombre: { contains: search } }),
      ...(categoriaId && { categoriaId: parseInt(categoriaId) }),
      ...(almacenId && { almacenId: parseInt(almacenId) }),
    };

    // Lógica de permisos de sucursal
    if (req.user.tipo === "administrador") {
      // Admin puede filtrar por sucursal si quiere
      if (sucursalId) where.sucursalId = parseInt(sucursalId);
    } else {
      // Supervisor y Cajero SOLO ven su sucursal
      if (!req.user.sucursalId) {
        // Si no tiene sucursal asignada, retornar vacío
        return res.json({
          data: [],
          meta: {
            total: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            itemsPerPage: parseInt(limit),
          },
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
          inventarios: true,
        },
        orderBy: { nombre: "asc" },
      }),
    ]);

    // Calcular stock dinámicamente desde inventarios
    const productosConStock = productos.map((producto) => {
      const stockTotal = producto.inventarios.reduce((sum, inv) => {
        return sum + parseFloat(inv.cantidad);
      }, 0);

      const { inventarios, ...productoData } = producto;
      return {
        ...productoData,
        stock: stockTotal,
      };
    });

    res.json({
      data: productosConStock,
      meta: {
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo productos" });
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
        inventarios: { include: { almacen: true } },
      },
    });
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Calcular stock total desde inventarios
    const stockTotal = producto.inventarios.reduce((sum, inv) => {
      return sum + parseFloat(inv.cantidad);
    }, 0);

    res.json({
      ...producto,
      stock: stockTotal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo producto" });
  }
};

// Crear producto
const createProducto = async (req, res) => {
  const {
    nombre,
    categoriaId,
    sucursalId,
    almacenId,
    talla,
    color,
    precioCompra,
    precioVenta,
    codigoBarras,
    codigoInterno,
    stock,
    stockMinimo,
    variantes: variantesRaw, // Nuevo campo para variantes
    codigoInternoBase, // Para generar códigos secuenciales si es necesario
  } = req.body;

  // Subir imagen a Cloudinary
  let imagen = null;
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      imagen = result.secure_url;
    } catch (err) {
      console.error("Error subiendo imagen a Cloudinary:", err);
      return res.status(500).json({ error: "Error subiendo imagen" });
    }
  }

  try {
    // Lógica para Variantes (Batch Creation)
    if (variantesRaw) {
      let variantes = [];
      try {
        variantes = JSON.parse(variantesRaw);
      } catch (e) {
        // En caso de error, intentar borrar la imagen subida de Cloudinary
        if (imagen) {
          await deleteFromCloudinary(imagen);
        }
        return res.status(400).json({ error: "Formato de variantes inválido" });
      }

      if (!Array.isArray(variantes) || variantes.length === 0) {
        if (imagen) {
          await deleteFromCloudinary(imagen);
        }
        return res.status(400).json({ error: "Lista de variantes vacía" });
      }

      const resultados = await prisma.$transaction(async (tx) => {
        const productosCreados = [];

        for (const variante of variantes) {
          // Generar código interno si no viene (o usar base + sufijo)
          const codigoInternoFinal =
            variante.codigoInterno ||
            (codigoInternoBase
              ? `${codigoInternoBase}-${variante.talla}`
              : `ZAP-${Date.now()}-${variante.talla}`);

          // 1. Crear producto individual
          const producto = await tx.producto.create({
            data: {
              nombre, // Mismo nombre para todos
              categoriaId: parseInt(categoriaId),
              sucursalId: parseInt(sucursalId),
              almacenId: parseInt(almacenId),
              talla: variante.talla, // Talla específica
              color, // Mismo color
              precioCompra: parseFloat(precioCompra) || 0,
              precioVenta: parseFloat(precioVenta) || 0,
              codigoBarras: variante.codigoBarras || null, // Código específico
              codigoInterno: codigoInternoFinal,
              stock: parseInt(variante.stock) || 0, // Stock específico
              stockMinimo: parseInt(stockMinimo) || 0,
              imagen, // Misma imagen (URL de Cloudinary)
            },
            include: { categoria: true, sucursal: true, almacen: true },
          });

          // 2. Inventario inicial
          const stockInicial = parseInt(variante.stock) || 0;
          if (stockInicial > 0 && almacenId) {
            await tx.inventario.create({
              data: {
                productoId: producto.id,
                almacenId: parseInt(almacenId),
                cantidad: stockInicial,
                ubicacionFisica: "N/A",
              },
            });

            await tx.movimientoInventario.create({
              data: {
                productoId: producto.id,
                almacenId: parseInt(almacenId),
                tipo: "ENTRADA",
                cantidad: stockInicial,
                motivo: "Stock inicial (Creación Lote)",
              },
            });
          }
          productosCreados.push(producto);
        }
        return productosCreados;
      });

      return res.status(201).json({
        message: `${resultados.length} productos creados`,
        data: resultados,
      });
    }

    // Lógica Original (Single Product)
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
          imagen, // URL de Cloudinary
        },
        include: { categoria: true, sucursal: true, almacen: true },
      });

      // 2. Si se especificó stock inicial, crear registro en Inventario
      const stockInicial = parseInt(stock) || 0;
      if (stockInicial > 0 && almacenId) {
        await tx.inventario.create({
          data: {
            productoId: producto.id,
            almacenId: parseInt(almacenId),
            cantidad: stockInicial,
            ubicacionFisica: "N/A",
          },
        });

        // 3. Registrar movimiento de inventario inicial
        await tx.movimientoInventario.create({
          data: {
            productoId: producto.id,
            almacenId: parseInt(almacenId),
            tipo: "ENTRADA",
            cantidad: stockInicial,
            motivo: "Stock inicial al crear producto",
          },
        });
      }

      return producto;
    });

    res.status(201).json(resultado);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "El código de barras o interno ya existe" });
    }
    res.status(500).json({ error: "Error creando producto" });
  }
};

// Actualizar producto
const updateProducto = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    categoriaId,
    sucursalId,
    almacenId,
    talla,
    color,
    precioCompra,
    precioVenta,
    codigoBarras,
    codigoInterno,
    stock,
    stockMinimo,
  } = req.body;

  // Subir nueva imagen a Cloudinary
  let imagen = undefined;
  if (req.file) {
    try {
      // Subir nueva imagen a Cloudinary
      const result = await uploadToCloudinary(req.file.buffer);
      imagen = result.secure_url;

      // Eliminar imagen anterior de Cloudinary si existe
      const productoAnterior = await prisma.producto.findUnique({
        where: { id: parseInt(id) },
      });
      if (productoAnterior && productoAnterior.imagen) {
        await deleteFromCloudinary(productoAnterior.imagen);
      }
    } catch (err) {
      console.error("Error subiendo imagen a Cloudinary:", err);
      return res.status(500).json({ error: "Error subiendo imagen" });
    }
  }

  try {
    // Advertencia si se intenta actualizar el stock directamente
    if (stock !== undefined) {
      console.warn(
        "⚠️ Intento de actualizar stock directamente. Use el módulo de inventario para ajustar stock.",
      );
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
        ...(imagen && { imagen }), // Solo actualizar imagen si se subió una nueva
      },
      include: { categoria: true, sucursal: true, almacen: true },
    });
    res.json(producto);
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error actualizando producto" });
  }
};

// Eliminar producto (hard delete si no tiene relaciones, soft delete si tiene)
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener producto para eliminar su imagen de Cloudinary
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(id) },
    });

    // Intentar eliminación física primero
    await prisma.producto.delete({
      where: { id: parseInt(id) },
    });

    // Si la eliminación fue exitosa, borrar imagen de Cloudinary
    if (producto && producto.imagen) {
      await deleteFromCloudinary(producto.imagen);
    }

    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    // Si falla por FK (tiene ventas/compras asociadas), hacer soft delete
    if (error.code === "P2003") {
      try {
        await prisma.producto.update({
          where: { id: parseInt(id) },
          data: { activo: false },
        });
        return res.json({
          message:
            "Producto desactivado correctamente (tiene registros históricos asociados)",
          softDeleted: true,
        });
      } catch (softDeleteError) {
        console.error(softDeleteError);
        return res
          .status(500)
          .json({ error: "Error al desactivar el producto" });
      }
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    console.error(error);
    res.status(500).json({ error: "Error eliminando producto" });
  }
};

// Buscar por código de barras
const getProductoByBarcode = async (req, res) => {
  const { codigo } = req.params;
  try {
    const producto = await prisma.producto.findFirst({
      where: {
        activo: true, // Solo buscar productos activos
        OR: [{ codigoBarras: codigo }, { codigoInterno: codigo }],
      },
      include: {
        categoria: true,
        sucursal: true,
        almacen: true,
        inventarios: true,
      },
    });
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Calcular stock total desde inventarios
    const stockTotal = producto.inventarios.reduce((sum, inv) => {
      return sum + parseFloat(inv.cantidad);
    }, 0);

    res.json({
      ...producto,
      stock: stockTotal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error buscando producto" });
  }
};

export {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  getProductoByBarcode,
  upload,
};
