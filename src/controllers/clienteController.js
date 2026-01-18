import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todos los clientes
const getClientes = async (req, res) => {
    try {
        const { search } = req.query;
        const where = search ? {
            OR: [
                { nombre: { contains: search } },
                { email: { contains: search } },
                { celular: { contains: search } }
            ]
        } : {};

        const clientes = await prisma.cliente.findMany({
            where,
            orderBy: { nombre: 'asc' }
        });
        res.json(clientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo clientes' });
    }
};

// Obtener cliente por ID
const getClienteById = async (req, res) => {
    const { id } = req.params;
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { id: parseInt(id) },
            include: { ventas: { take: 10, orderBy: { fecha: 'desc' } } }
        });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(cliente);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo cliente' });
    }
};

// Crear cliente
const createCliente = async (req, res) => {
    const { nombre, email, direccion, celular } = req.body;
    try {
        const cliente = await prisma.cliente.create({
            data: { nombre, email, direccion, celular }
        });
        res.status(201).json(cliente);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando cliente' });
    }
};

// Actualizar cliente
const updateCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, email, direccion, celular } = req.body;
    try {
        const cliente = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: { nombre, email, direccion, celular }
        });
        res.json(cliente);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.status(500).json({ error: 'Error actualizando cliente' });
    }
};

// Eliminar cliente
const deleteCliente = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.cliente.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.status(500).json({ error: 'Error eliminando cliente' });
    }
};

export { getClientes, getClienteById, createCliente, updateCliente, deleteCliente };
