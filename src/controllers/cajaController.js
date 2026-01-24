import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todas las cajas
const getCajas = async (req, res) => {
    try {
        const { sucursalId } = req.query;
        const where = sucursalId ? { sucursalId: parseInt(sucursalId) } : {};

        const cajas = await prisma.caja.findMany({
            where,
            include: { sucursal: true },
            orderBy: { nombre: 'asc' }
        });
        res.json(cajas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo cajas' });
    }
};

// Obtener caja por ID
const getCajaById = async (req, res) => {
    const { id } = req.params;
    try {
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(id) },
            include: { sucursal: true, sesiones: { take: 5, orderBy: { fechaInicio: 'desc' } } }
        });
        if (!caja) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }
        res.json(caja);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo caja' });
    }
};

// Crear caja
const createCaja = async (req, res) => {
    const { nombre, sucursalId, codigo } = req.body;
    try {
        const caja = await prisma.caja.create({
            data: {
                nombre,
                sucursalId: parseInt(sucursalId),
                codigo,
                estado: 'CERRADA'
            },
            include: { sucursal: true }
        });
        res.status(201).json(caja);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando caja' });
    }
};

// Actualizar caja
const updateCaja = async (req, res) => {
    const { id } = req.params;
    const { nombre, sucursalId, codigo, estado } = req.body;
    try {
        const caja = await prisma.caja.update({
            where: { id: parseInt(id) },
            data: {
                nombre,
                sucursalId: sucursalId ? parseInt(sucursalId) : undefined,
                codigo,
                estado
            },
            include: { sucursal: true }
        });
        res.json(caja);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }
        res.status(500).json({ error: 'Error actualizando caja' });
    }
};

// Eliminar caja
const deleteCaja = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.caja.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Caja eliminada correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'No se puede eliminar, tiene sesiones asociadas' });
        }
        res.status(500).json({ error: 'Error eliminando caja' });
    }
};

// Abrir caja (aperturar)
const abrirCaja = async (req, res) => {
    const { id } = req.params;
    const { montoInicial, usuarioId } = req.body;

    // Validar usuarioId
    if (!usuarioId) {
        return res.status(400).json({ message: 'usuarioId es requerido' });
    }

    try {
        // 1. Verificar que la caja existe
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(id) }
        });

        if (!caja) {
            return res.status(404).json({ message: 'Caja no encontrada' });
        }

        // 2. Verificar que la caja no esté ocupada
        if (caja.estado === 'OCUPADA') {
            return res.status(400).json({ message: 'La caja ya está ocupada' });
        }

        // 3. Crear apertura y actualizar estado en transacción
        const [apertura, cajaActualizada] = await prisma.$transaction([
            prisma.sesionCaja.create({
                data: {
                    caja: { connect: { id: parseInt(id) } },
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    montoInicial: parseFloat(montoInicial) || 0,
                    estado: 'ABIERTA'
                }
            }),
            prisma.caja.update({
                where: { id: parseInt(id) },
                data: { estado: 'OCUPADA' }
            })
        ]);

        // 4. Retornar respuesta
        res.status(201).json({
            message: 'Caja aperturada exitosamente',
            caja: {
                id: cajaActualizada.id,
                nombre: cajaActualizada.nombre,
                estado: cajaActualizada.estado
            },
            apertura: {
                id: apertura.id,
                cajaId: apertura.cajaId,
                usuarioId: apertura.usuarioId,
                montoInicial: parseFloat(apertura.montoInicial),
                fechaApertura: apertura.fechaInicio
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al aperturar la caja' });
    }
};

export { getCajas, getCajaById, createCaja, updateCaja, deleteCaja, abrirCaja };
