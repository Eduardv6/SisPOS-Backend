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

export { verifyToken, isAdmin, isSupervisorOrAdmin };