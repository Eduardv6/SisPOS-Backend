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

        const saldoInicialVal = parseFloat(montoInicial) || 0;

        // 3. Crear apertura, movimiento de apertura y actualizar estado en transacción
        const result = await prisma.$transaction(async (tx) => {
            // Crear sesión de caja
            const apertura = await tx.sesionCaja.create({
                data: {
                    caja: { connect: { id: parseInt(id) } },
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    montoInicial: saldoInicialVal,
                    estado: 'ABIERTA'
                }
            });

            // Crear movimiento de APERTURA
            await tx.movimientoCaja.create({
                data: {
                    sesionCaja: { connect: { id: apertura.id } },
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    tipo: 'APERTURA',
                    monto: saldoInicialVal,
                    motivo: 'Apertura de caja'
                }
            });

            // Actualizar estado de la caja
            const cajaActualizada = await tx.caja.update({
                where: { id: parseInt(id) },
                data: {
                    estado: 'OCUPADA',
                    saldoInicial: saldoInicialVal,
                    saldoActual: saldoInicialVal
                }
            });

            return { apertura, cajaActualizada };
        });

        // 4. Retornar respuesta
        res.status(201).json({
            message: 'Caja aperturada exitosamente',
            caja: {
                id: result.cajaActualizada.id,
                nombre: result.cajaActualizada.nombre,
                estado: result.cajaActualizada.estado,
                saldoInicial: parseFloat(result.cajaActualizada.saldoInicial),
                saldoActual: parseFloat(result.cajaActualizada.saldoActual)
            },
            apertura: {
                id: result.apertura.id,
                cajaId: result.apertura.cajaId,
                usuarioId: result.apertura.usuarioId,
                montoInicial: parseFloat(result.apertura.montoInicial),
                fechaApertura: result.apertura.fechaInicio
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al aperturar la caja' });
    }
};

// Registrar ingreso de dinero
const registrarIngreso = async (req, res) => {
    const { id } = req.params;
    const { monto, tipo, motivo, usuarioId } = req.body;

    if (!monto || monto <= 0) {
        return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }

    try {
        // 1. Verificar caja y sesión activa
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(id) }
        });

        if (!caja) {
            return res.status(404).json({ message: 'Caja no encontrada' });
        }

        if (caja.estado !== 'OCUPADA') {
            return res.status(400).json({ message: 'La caja no está abierta' });
        }

        const sesionActiva = await prisma.sesionCaja.findFirst({
            where: { cajaId: parseInt(id), estado: 'ABIERTA' }
        });

        if (!sesionActiva) {
            return res.status(400).json({ message: 'No hay sesión de caja activa' });
        }

        // 2. Registrar movimiento y actualizar saldo
        const [movimiento, cajaActualizada] = await prisma.$transaction([
            prisma.movimientoCaja.create({
                data: {
                    sesionCaja: { connect: { id: sesionActiva.id } },
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    tipo: 'INGRESO',
                    monto: parseFloat(monto),
                    motivo: motivo || 'Ingreso de dinero'
                }
            }),
            prisma.caja.update({
                where: { id: parseInt(id) },
                data: {
                    saldoActual: { increment: parseFloat(monto) }
                }
            })
        ]);

        res.status(201).json({
            message: 'Ingreso registrado exitosamente',
            movimiento,
            saldoActual: parseFloat(cajaActualizada.saldoActual)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar ingreso' });
    }
};

// Registrar retiro de dinero
const registrarRetiro = async (req, res) => {
    const { id } = req.params;
    const { monto, tipo, motivo, usuarioId } = req.body;

    if (!monto || monto <= 0) {
        return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }

    try {
        // 1. Verificar caja y sesión activa
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(id) }
        });

        if (!caja) {
            return res.status(404).json({ message: 'Caja no encontrada' });
        }

        if (caja.estado !== 'OCUPADA') {
            return res.status(400).json({ message: 'La caja no está abierta' });
        }

        // 2. Validar que el saldo no quede negativo
        if (parseFloat(caja.saldoActual) < parseFloat(monto)) {
            return res.status(400).json({
                message: 'Saldo insuficiente para realizar el retiro',
                saldoActual: parseFloat(caja.saldoActual),
                montoSolicitado: parseFloat(monto)
            });
        }

        const sesionActiva = await prisma.sesionCaja.findFirst({
            where: { cajaId: parseInt(id), estado: 'ABIERTA' }
        });

        if (!sesionActiva) {
            return res.status(400).json({ message: 'No hay sesión de caja activa' });
        }

        // 3. Registrar movimiento y actualizar saldo
        const [movimiento, cajaActualizada] = await prisma.$transaction([
            prisma.movimientoCaja.create({
                data: {
                    sesionCaja: { connect: { id: sesionActiva.id } },
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    tipo: 'RETIRO',
                    monto: parseFloat(monto),
                    motivo: motivo || 'Retiro de dinero'
                }
            }),
            prisma.caja.update({
                where: { id: parseInt(id) },
                data: {
                    saldoActual: { decrement: parseFloat(monto) }
                }
            })
        ]);

        res.status(201).json({
            message: 'Retiro registrado exitosamente',
            movimiento,
            saldoActual: parseFloat(cajaActualizada.saldoActual)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar retiro' });
    }
};

// Cerrar caja
const cerrarCajaEndpoint = async (req, res) => {
    const { id } = req.params;
    const { usuarioId, montoFinal } = req.body;

    try {
        const caja = await prisma.caja.findUnique({
            where: { id: parseInt(id) }
        });

        if (!caja || caja.estado !== 'OCUPADA') {
            return res.status(400).json({ message: 'La caja no está abierta' });
        }

        const sesionActiva = await prisma.sesionCaja.findFirst({
            where: { cajaId: parseInt(id), estado: 'ABIERTA' }
        });

        if (!sesionActiva) {
            return res.status(400).json({ message: 'No hay sesión de caja activa' });
        }

        const montoFinalVal = parseFloat(montoFinal) || parseFloat(caja.saldoActual);

        // Cerrar sesión, crear movimiento de cierre y liberar caja
        await prisma.$transaction(async (tx) => {
            // Crear movimiento de CIERRE
            await tx.movimientoCaja.create({
                data: {
                    sesionCaja: { connect: { id: sesionActiva.id } },
                    usuario: { connect: { id: parseInt(usuarioId) } },
                    tipo: 'CIERRE',
                    monto: montoFinalVal,
                    motivo: 'Cierre de caja'
                }
            });

            // Actualizar sesión
            await tx.sesionCaja.update({
                where: { id: sesionActiva.id },
                data: {
                    fechaFin: new Date(),
                    montoFinal: montoFinalVal,
                    estado: 'CERRADA'
                }
            });

            // Liberar caja
            await tx.caja.update({
                where: { id: parseInt(id) },
                data: {
                    estado: 'LIBRE',
                    saldoInicial: 0,
                    saldoActual: 0
                }
            });
        });

        res.json({
            message: 'Caja cerrada exitosamente',
            resumen: {
                saldoInicial: parseFloat(sesionActiva.montoInicial),
                saldoFinal: montoFinalVal,
                diferencia: montoFinalVal - parseFloat(caja.saldoActual)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cerrar caja' });
    }
};

export { getCajas, getCajaById, createCaja, updateCaja, deleteCaja, abrirCaja, registrarIngreso, registrarRetiro, cerrarCajaEndpoint };
