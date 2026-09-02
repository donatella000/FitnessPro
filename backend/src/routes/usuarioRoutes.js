const express = require('express');
const router = express.Router();

// A. Reutiliza la función registrar desde authController para el alta desde el panel
const { registrar } = require('../controllers/authController');

// B. Importa las funciones de gestión de usuario
const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario
} = require('../controllers/usuarioController');

// C. Importa los middlewares de seguridad
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas de usuarios exigen inicio de sesión
router.use(verificarToken);

// ==========================================
// RUTAS DE GESTIÓN DE USUARIOS
// ==========================================

// 1. Listar todos los usuarios (Solo Administrador: 1 y Profesor: 2)
router.get('/', permitirRoles(1, 2), obtenerUsuarios);

// 2. Obtener un usuario puntual por ID (Admin, Profesor o el propio Alumno validado en controller)
router.get('/:id', obtenerUsuarioPorId);

// 3. Crear usuario desde el panel interno (Admin: 1 y Profesor: 2)
router.post('/', permitirRoles(1, 2), registrar);

// 4. Actualizar datos de usuario (Alumno edita lo suyo; Admin y Profesor editan usuarios)
router.put('/:id', actualizarUsuario);

// 5. Eliminar usuario (Admin: 1 y Profesor: 2, con jerarquía controlada)
router.delete('/:id', permitirRoles(1, 2), eliminarUsuario);

module.exports = router;