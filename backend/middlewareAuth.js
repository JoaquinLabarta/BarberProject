// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN (JWT)
// ------------------------------------------------------------
// AQUÍ SE VALIDA EL TOKEN Y SE CONTROLAN LOS ROLES:
// - 'barbero'
// - 'cliente'
// ============================================================

const jwt = require('jsonwebtoken');
const CONFIG = require('./config');

// Middleware para verificar que el usuario esté autenticado.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No autorizado. Falta token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    // Guardamos los datos del usuario en la request para usarlos después.
    req.user = {
      id: decoded.id,
      role: decoded.role,
      nombre: decoded.nombre,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
}

// Middleware para exigir que el usuario tenga un rol específico.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};

