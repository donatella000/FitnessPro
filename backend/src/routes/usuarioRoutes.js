const express = require('express');
const router = express.Router();

const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  reactivarUsuario,
  actualizarFoto,
  eliminarFoto
} = require('../controllers/usuarioController');

const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas de usuarios exigen inicio de sesión
router.use(verificarToken);

// ==========================================
// RUTAS DE GESTIÓN DE USUARIOS
// ==========================================
// Los permisos finos (quién puede ver o editar a quién) se validan en el controller.

// 1. Listar usuarios (Admin ve todos, Profesor solo alumnos)
router.get('/', permitirRoles(1, 2), obtenerUsuarios);

// 2. Ver un usuario con sus suscripciones activas
router.get('/:id', obtenerUsuarioPorId);

// 3. Crear usuario desde el panel (contraseña inicial = DNI)
router.post('/', permitirRoles(1, 2), crearUsuario);

// 4. Actualizar datos
router.put('/:id', actualizarUsuario);

// 5. Dar de baja (borrado lógico)
router.delete('/:id', permitirRoles(1, 2), eliminarUsuario);

// 6. Reactivar un usuario dado de baja
router.put('/:id/reactivar', permitirRoles(1, 2), reactivarUsuario);

// 7. Foto de perfil (cada usuario la suya; admin y profesor según permisos)
router.put('/:id/foto', actualizarFoto);
router.delete('/:id/foto', eliminarFoto);

module.exports = router;
