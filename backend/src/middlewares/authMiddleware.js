const jwt = require('jsonwebtoken');

// ==========================================
// 1. VERIFICAR TOKEN JWT
// ==========================================
const verificarToken = (req, res, next) => {
  // Se obtiene el header Authorization (formato: "Bearer <token>")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      mensaje: 'Acceso denegado: No se proporcionó un token de autenticación.'
    });
  }

  try {
    // Validar y decodificar el token con la clave secreta del .env
    const usuarioDecodificado = jwt.verify(token, process.env.JWT_SECRET);
    
    // Inyectar los datos del usuario en la petición (req.usuario)
    req.usuario = usuarioDecodificado;
    next();
  } catch (error) {
    return res.status(403).json({
      mensaje: 'Token inválido o expirado. Por favor, iniciá sesión nuevamente.'
    });
  }
};

// ==========================================
// 2. CONTROL DE ACCESO POR ROLES
// ==========================================
// Permite verificar roles pasando IDs numéricos (1, 2, 3) o nombres ('administrador', 'profesor', 'alumno')
const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'No autenticado: Se requiere iniciar sesión.'
      });
    }

    const { id_rol, rol_nombre } = req.usuario;

    // Verificar si el rol del usuario coincide con alguno de los roles autorizados
    const tienePermiso = rolesPermitidos.some((rol) => {
      if (typeof rol === 'number') {
        return rol === id_rol;
      }
      if (typeof rol === 'string') {
        return rol.toLowerCase() === (rol_nombre || '').toLowerCase();
      }
      return false;
    });

    if (!tienePermiso) {
      return res.status(403).json({
        mensaje: 'Acceso denegado: No tenés los permisos necesarios para realizar esta acción.'
      });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  permitirRoles
};