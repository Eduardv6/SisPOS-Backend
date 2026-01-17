import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      imageUrl, 
      brandId, 
      categoryId,
      generalPurchasePrice, 
      generalSalePrice,
      variants 
    } = req.body;

    if (!name || !brandId || !categoryId || !variants || variants.length === 0) {
      return res.status(400).json({ error: 'Faltan datos obligatorios o al menos una variante (talla/color).' });
    }

    const formattedVariants = variants.map((variant) => {
      const autoSku = variant.sku || `${name.substring(0,3).toUpperCase()}-${variant.sizeId}-${Date.now().toString().slice(-4)}`;

      return {
        sizeId: parseInt(variant.sizeId),
        colorId: parseInt(variant.colorId),
        sku: autoSku,
        purchasePrice: parseFloat(variant.purchasePrice || generalPurchasePrice),
        salePrice: parseFloat(variant.salePrice || generalSalePrice),
        stockQuantity: parseInt(variant.stockQuantity),
        minStockLevel: 5,
        kardex: {
          create: {
            type: 'ADJUSTMENT_IN',
            quantity: parseInt(variant.stockQuantity),
            description: 'Inventario Inicial',
            reference: 'CREACION-PRODUCTO'
          }
        }
      };
    });

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        imageUrl,
        brandId: parseInt(brandId),
        categoryId: parseInt(categoryId),
        isActive: true,
        variants: {
          create: formattedVariants,
        },
      },
      include: {
        variants: true,
      },
    });

    return res.status(201).json({
      message: 'Producto creado exitosamente',
      product: newProduct
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El SKU o código de barras ya existe.' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProducts = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const categoryId = req.query.categoryId;
    const brandId = req.query.brandId;


    const skip = (page - 1) * limit;

    const whereClause = {
      isActive: true,
      ...(search && {
        name: {
          contains: search
        }
      }),
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(brandId && { brandId: parseInt(brandId) })
    };

    const [totalProducts, products] = await prisma.$transaction([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        include: {
          brand: true,
          category: true,
          variants: {
            select: {
              stockQuantity: true,
              salePrice: true,
              minStockLevel: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    const formattedProducts = products.map(product => {
      const variants = product.variants;

      const totalStock = variants.reduce((acc, curr) => acc + curr.stockQuantity, 0);

      const isLowStock = totalStock <= 10 && totalStock > 0;
      const isOutOfStock = totalStock === 0;

      let priceDisplay = "N/A";
      if (variants.length > 0) {
        const prices = variants.map(v => parseFloat(v.salePrice));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        priceDisplay = minPrice === maxPrice 
          ? `$${minPrice.toFixed(2)}` 
          : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      }

      return {
        id: product.id,
        image: product.imageUrl || 'https://via.placeholder.com/150',
        name: product.name,
        brand: product.brand.name,
        category: product.category.name,
        stock: totalStock,
        price: priceDisplay,
        status: { 
            label: isOutOfStock ? 'Agotado' : (isLowStock ? 'Bajo Stock' : 'Disponible'),
            variant: isOutOfStock ? 'danger' : (isLowStock ? 'warning' : 'success')
        },
        variantsCount: variants.length
      };
    });

    return res.status(200).json({
      data: formattedProducts,
      meta: {
        totalItems: totalProducts,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ error: 'Error interno al listar productos' });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, imageUrl, brandId, categoryId, variants } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        imageUrl,
        brandId: parseInt(brandId),
        categoryId: parseInt(categoryId),
        
        variants: {
          upsert: variants.map((variant) => ({
            where: { id: variant.id || 0 },
            update: {
              sku: variant.sku,
              purchasePrice: parseFloat(variant.purchasePrice),
              salePrice: parseFloat(variant.salePrice),
              stockQuantity: parseInt(variant.stockQuantity),
              minStockLevel: 5
            },
            
            create: {
              sizeId: parseInt(variant.sizeId),
              colorId: parseInt(variant.colorId),
              sku: variant.sku,
              purchasePrice: parseFloat(variant.purchasePrice),
              salePrice: parseFloat(variant.salePrice),
              stockQuantity: parseInt(variant.stockQuantity),
              minStockLevel: 5
            }
          }))
        }
      },
      include: { variants: true }
    });

    res.json(product);

  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
       return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(500).json({ error: 'Error actualizando producto' });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { 
        isActive: false
      }
    });

    res.json({ 
      message: 'Producto eliminado (archivado) correctamente',
      product 
    });

  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

export { createProduct, getProducts, updateProduct, deleteProduct };