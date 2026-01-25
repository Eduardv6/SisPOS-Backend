import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener todos los movimientos de caja con filtros y paginación
const getMovimientosCaja = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            fechaInicio,
            fechaFin,
            cajaId,
            tipo
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Construir filtros
        const where = {};

        // Filtro por tipo
        if (tipo) {
            where.tipo = tipo;
        }

        // Filtro por rango de fechas
        if (fechaInicio || fechaFin) {
            where.fecha = {};
            if (fechaInicio) {
                where.fecha.gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                // Agregar un día para incluir todo el día final
                const endDate = new Date(fechaFin);
                endDate.setDate(endDate.getDate() + 1);
                where.fecha.lt = endDate;
            }
        }

        // Filtro por caja (a través de sesionCaja)
        if (cajaId) {
            where.sesionCaja = {
                cajaId: parseInt(cajaId)
            };
        }

        // Ejecutar consulta con paginación
        const [totalItems, movimientos] = await prisma.$transaction([
            prisma.movimientoCaja.count({ where }),
            prisma.movimientoCaja.findMany({
                where,
                skip,
                take,
                include: {
                    sesionCaja: {
                        include: {
                            caja: {
                                select: {
                                    id: true,
                                    nombre: true
                                }
                            }
                        }
                    },
                    usuario: {
                        select: {
                            id: true,
                            nombres: true,
                            email: true
                        }
                    }
                },
                orderBy: { fecha: 'desc' }
            })
        ]);

        // Formatear respuesta
        const data = movimientos.map(mov => ({
            id: mov.id,
            fecha: mov.fecha,
            tipo: mov.tipo,
            monto: parseFloat(mov.monto),
            descripcion: mov.motivo,
            caja: mov.sesionCaja?.caja ? {
                id: mov.sesionCaja.caja.id,
                nombre: mov.sesionCaja.caja.nombre
            } : null,
            usuario: {
                id: mov.usuario.id,
                nombres: mov.usuario.nombres,
                email: mov.usuario.email
            }
        }));

        const totalPages = Math.ceil(totalItems / take);

        res.json({
            data,
            totalPages,
            currentPage: parseInt(page),
            totalItems
        });

    } catch (error) {
        console.error('Error obteniendo movimientos de caja:', error);
        res.status(500).json({ error: 'Error obteniendo movimientos de caja' });
    }
};

export { getMovimientosCaja };
