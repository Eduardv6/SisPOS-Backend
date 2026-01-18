import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todas las categorías
const getCategorias = async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      select: {
        id: true,
        nombre: true,
        activa: true
      },
      orderBy: { nombre: 'asc' }
    });
    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
};

// Obtener categoría por ID
const getCategoriaById = async (req, res) => {
  const { id } = req.params;
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        nombre: true,
        activa: true
      }
    });
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo categoría' });
  }
};

// Crear categoría
const createCategoria = async (req, res) => {
  const { nombre, activa } = req.body;
  try {
    const categoria = await prisma.categoria.create({
      data: { 
        nombre, 
        activa: activa ?? true 
      },
      select: {
        id: true,
        nombre: true,
        activa: true
      }
    });
    res.status(201).json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando categoría' });
  }
};

// Actualizar categoría
const updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre, activa } = req.body;
  try {
    const categoria = await prisma.categoria.update({
      where: { id: parseInt(id) },
      data: { nombre, activa },
      select: {
        id: true,
        nombre: true,
        activa: true
      }
    });
    res.json(categoria);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.status(500).json({ error: 'Error actualizando categoría' });
  }
};

// Eliminar categoría (soft delete)
const deleteCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.categoria.update({
      where: { id: parseInt(id) },
      data: { activa: false }
    });
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.status(500).json({ error: 'Error eliminando categoría' });
  }
};

export { getCategorias, getCategoriaById, createCategoria, updateCategoria, deleteCategoria };
