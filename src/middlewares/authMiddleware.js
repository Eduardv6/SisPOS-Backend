import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Solo permitir Administradores
const isAdmin = (req, res, next) => {
  if (req.user.tipo !== 'administrador') {
    return res.status(403).json({ error: 'Acceso restringido a Administradores.' });
  }
  next();
};

// Permitir Supervisores o Administradores
const isSupervisorOrAdmin = (req, res, next) => {
  if (req.user.tipo !== 'administrador' && req.user.tipo !== 'supervisor') {
    return res.status(403).json({ error: 'Acceso restringido a Supervisores o Administradores.' });
  }
  next();
};

// Verificar permiso específico
const hasPermission = (permiso) => {
  return (req, res, next) => {
    // Administradores siempre tienen todos los permisos
    if (req.user.tipo === 'administrador') {
      return next();
    }

    // Verificar si el permiso está en el array de permisos del usuario (del token)
    if (req.user.permisos && req.user.permisos.includes(permiso)) {
      return next();
    }

    return res.status(403).json({ error: `No tienes permisos para acceder a este recurso. Requiere: ${permiso}` });
  };
};

// Verificar si tiene al menos uno de los permisos
const hasAnyPermission = (permisos) => {
  return (req, res, next) => {
    if (req.user.tipo === 'administrador') {
      return next();
    }

    if (req.user.permisos && permisos.some(p => req.user.permisos.includes(p))) {
      return next();
    }

    return res.status(403).json({ error: 'No tienes permisos suficientes.' });
  };
};

// Validar Rol Cajero
const isCajero = (req, res, next) => {
  if (req.user.tipo !== 'cajero') {
    return res.status(403).json({ error: 'Acceso restringido a Cajeros.' });
  }
  next();
};

// Validar que el cajero tenga caja asignada y sea la correcta
const checkCajaAsignada = (req, res, next) => {
  if (req.user.tipo === 'administrador' || req.user.tipo === 'supervisor') {
    return next();
  }

  if (req.user.tipo === 'cajero') {
    if (!req.user.cajaId) {
      return res.status(403).json({ error: 'No tienes una caja asignada. Contacta al administrador.' });
    }
    
    // Si la ruta tiene un parámetro id (de caja), validamos que coincida
    const cajaIdParam = req.params.id || req.body.cajaId;
    if (cajaIdParam && parseInt(cajaIdParam) !== req.user.cajaId) {
      return res.status(403).json({ error: 'No tienes permiso para operar esta caja.' });
    }
  }
  next();
};

// Validar que exista una sesión de caja activa para el usuario
const requireActiveCaja = async (req, res, next) => {
  // Admin y Supervisor pueden saltarse esto si es gestión, pero para crear ventas deberían tener caja abierta si se requiere.
  // Asumiremos que para crear ventas SIEMPRE se necesita caja abierta.
  
  try {
    const sesionActiva = await prisma.sesionCaja.findFirst({
        where: { 
            usuarioId: req.user.id,
            estado: 'ABIERTA',
            fechaFin: null
        }
    });

    if (!sesionActiva) {
        return res.status(403).json({ error: 'Debes tener una caja abierta para realizar esta acción.' });
    }

    // Adjuntar sesión al request para usarla en el controlador
    req.sesionCaja = sesionActiva;
    next();
  } catch (error) {
    console.error('Error verificando sesión de caja:', error);
    return res.status(500).json({ error: 'Error verificando estado de caja' });
  }
};

export { verifyToken, isAdmin, isSupervisorOrAdmin, hasPermission, hasAnyPermission, isCajero, checkCajaAsignada, requireActiveCaja };