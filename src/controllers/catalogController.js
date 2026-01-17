import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(brands);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo marcas' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
};

const getSizes = async (req, res) => {
  try {
    const sizes = await prisma.size.findMany({
      orderBy: { id: 'asc' } 
    });
    res.json(sizes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo tallas' });
  }
};

const getColors = async (req, res) => {
  try {
    const colors = await prisma.color.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(colors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo colores' });
  }
};

export { getBrands, getCategories, getSizes, getColors };