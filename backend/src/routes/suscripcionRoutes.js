const express = require('express');
const router = express.Router();
const {
  obtenerSuscripciones,
  obtenerSuscripcionPorId,
  crearSuscripcion,
  actualizarSuscripcion,
  eliminarSuscripcion,
  seleccionarSuscripcion
} = require('../controllers/suscripcionController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas requieren estar logueado
router.use(verificarToken);

// 1. Consultar planes de suscripción (Disponible para Alumno, Profesor y Administrador)
router.get('/', obtenerSuscripciones);
router.get('/:id', obtenerSuscripcionPorId);

// 2. Elegir o cambiar suscripción (Alumno elige la suya, Admin puede asignarla a un alumno)
router.post('/seleccionar', seleccionarSuscripcion);

// 3. Crear, modificar y eliminar suscripciones (Exclusivo Administrador: rol 1)
router.post('/', permitirRoles(1), crearSuscripcion);
router.put('/:id', permitirRoles(1), actualizarSuscripcion);
router.delete('/:id', permitirRoles(1), eliminarSuscripcion);

module.exports = router;