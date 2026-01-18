import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Abrir caja (crear sesión)
const abrirCaja = async (req, res) => {
    const { cajaId, montoInicial } = req.body;
    const usuarioId = req.user.id;

    try {
        // Verificar que la caja no tenga una sesión abierta
        const sesionAbierta = await prisma.sesionCaja.findFirst({
            where: {
                cajaId: parseInt(cajaId),
                estado: 'ABIERTA'
            }
        });

        if (sesionAbierta) {
            return res.status(400).json({ error: 'Esta caja ya tiene una sesión abierta' });
        }

        // Crear sesión y actualizar estado de la caja
        const [sesion] = await prisma.$transaction([
            prisma.sesionCaja.create({
                data: {
                    cajaId: parseInt(cajaId),
                    usuarioId,
                    montoInicial: parseFloat(montoInicial) || 0,
                    estado: 'ABIERTA'
                },
                include: { caja: true, usuario: { select: { id: true, nombres: true } } }
            }),
            prisma.caja.update({
                where: { id: parseInt(cajaId) },
                data: { estado: 'OCUPADA' }
            })
        ]);

        res.status(201).json({
            message: 'Caja abierta correctamente',
            sesion
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error abriendo caja' });
    }
};

// Cerrar caja (finalizar sesión)
const cerrarCaja = async (req, res) => {
    const { sesionId, montoFinal } = req.body;

    try {
        const sesion = await prisma.sesionCaja.findUnique({
            where: { id: parseInt(sesionId) },
            include: { ventas: true, movimientos: true }
        });

        if (!sesion) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }

        if (sesion.estado === 'CERRADA') {
            return res.status(400).json({ error: 'Esta sesión ya está cerrada' });
        }

        // Calcular totales
        const totalVentas = sesion.ventas
            .filter(v => v.estado === 'completada')
            .reduce((acc, v) => acc + parseFloat(v.total), 0);

        const totalIngresos = sesion.movimientos
            .filter(m => m.tipo === 'INGRESO')
            .reduce((acc, m) => acc + parseFloat(m.monto), 0);

        const totalRetiros = sesion.movimientos
            .filter(m => m.tipo === 'RETIRO')
            .reduce((acc, m) => acc + parseFloat(m.monto), 0);

        const montoEsperado = parseFloat(sesion.montoInicial) + totalVentas + totalIngresos - totalRetiros;

        // Cerrar sesión y liberar caja
        const [sesionCerrada] = await prisma.$transaction([
            prisma.sesionCaja.update({
                where: { id: parseInt(sesionId) },
                data: {
                    fechaFin: new Date(),
                    montoFinal: parseFloat(montoFinal),
                    estado: 'CERRADA'
                }
            }),
            prisma.caja.update({
                where: { id: sesion.cajaId },
                data: { estado: 'LIBRE' }
            })
        ]);

        res.json({
            message: 'Caja cerrada correctamente',
            resumen: {
                montoInicial: parseFloat(sesion.montoInicial),
                totalVentas,
                totalIngresos,
                totalRetiros,
                montoEsperado,
                montoFinal: parseFloat(montoFinal),
                diferencia: parseFloat(montoFinal) - montoEsperado
            },
            sesion: sesionCerrada
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error cerrando caja' });
    }
};

// Obtener sesión activa de una caja
const getSesionActiva = async (req, res) => {
    const { cajaId } = req.params;
    try {
        const sesion = await prisma.sesionCaja.findFirst({
            where: {
                cajaId: parseInt(cajaId),
                estado: 'ABIERTA'
            },
            include: {
                caja: true,
                usuario: { select: { id: true, nombres: true } },
                ventas: { where: { estado: 'completada' } },
                movimientos: true
            }
        });

        if (!sesion) {
            return res.status(404).json({ error: 'No hay sesión activa en esta caja' });
        }

        res.json(sesion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo sesión' });
    }
};

// Registrar movimiento (ingreso/retiro)
const registrarMovimiento = async (req, res) => {
    const { sesionCajaId, tipo, monto, motivo } = req.body;
    const usuarioId = req.user.id;

    try {
        const movimiento = await prisma.movimientoCaja.create({
            data: {
                sesionCajaId: parseInt(sesionCajaId),
                usuarioId,
                tipo,
                monto: parseFloat(monto),
                motivo
            }
        });

        res.status(201).json({
            message: `${tipo} registrado correctamente`,
            movimiento
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error registrando movimiento' });
    }
};

// Obtener movimientos de una sesión
const getMovimientos = async (req, res) => {
    const { sesionId } = req.params;
    try {
        const movimientos = await prisma.movimientoCaja.findMany({
            where: { sesionCajaId: parseInt(sesionId) },
            include: { usuario: { select: { id: true, nombres: true } } },
            orderBy: { fecha: 'desc' }
        });
        res.json(movimientos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo movimientos' });
    }
};

export { abrirCaja, cerrarCaja, getSesionActiva, registrarMovimiento, getMovimientos };
