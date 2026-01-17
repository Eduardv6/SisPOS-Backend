import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  // 1. Obtener el token del header "Authorization"
  // Formato esperado: "Bearer <token_aqui>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Tomamos la segunda parte

  if (!token) {
    return res.status(403).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    // 2. Verificar el token con nuestra clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Guardar los datos del usuario en la petición (req)
    // Así, en los controladores siguientes sabremos quién es el usuario
    req.user = decoded; 
    
    next(); // Dejar pasar al siguiente controlador

  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware extra: Solo permitir Admins
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso restringido a Administradores.' });
  }
  next();
};

export { verifyToken, isAdmin };