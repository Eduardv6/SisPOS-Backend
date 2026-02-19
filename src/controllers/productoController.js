import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configuración de multer para almacenamiento local
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../uploads");
    // Crear carpeta si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
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

  // Proceso de subida de imagen (Local)
  let imagen = null;
  if (req.file) {
    // Construir URL relativa para guardar en DB
    // Se asume que el frontend tiene acceso a la carpeta uploads mediante un endpoint estático
    imagen = `/uploads/${req.file.filename}`;
  }

  try {
    // Lógica para Variantes (Batch Creation)
    if (variantesRaw) {
      let variantes = [];
      try {
        variantes = JSON.parse(variantesRaw);
      } catch (e) {
        // En caso de error, intentar borrar la imagen subida si existe
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: "Formato de variantes inválido" });
      }

      if (!Array.isArray(variantes) || variantes.length === 0) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
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
              imagen, // Misma imagen
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
          imagen, // Guardar URL de la imagen
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

  // Subir nueva imagen (Local)
  let imagen = undefined;
  if (req.file) {
    imagen = `/uploads/${req.file.filename}`;

    // Opcional: Eliminar imagen anterior si existe
    try {
      const productoAnterior = await prisma.producto.findUnique({
        where: { id: parseInt(id) },
      });
      if (
        productoAnterior &&
        productoAnterior.imagen &&
        productoAnterior.imagen.startsWith("/uploads/")
      ) {
        const oldImagePath = path.join(
          __dirname,
          "../../",
          productoAnterior.imagen,
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } catch (err) {
      console.error("Error al eliminar imagen anterior:", err);
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

// Eliminar producto
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.producto.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({ error: "No se puede eliminar, tiene ventas asociadas" });
    }
    res.status(500).json({ error: "Error eliminando producto" });
  }
};

// Buscar por código de barras
const getProductoByBarcode = async (req, res) => {
  const { codigo } = req.params;
  try {
    const producto = await prisma.producto.findFirst({
      where: {
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
