const express = require('express');
const router = express.Router();
const {
  obtenerSuscripciones,
  obtenerSuscripcionPorId,
  crearSuscripcion,
  generarPlanes,
  actualizarSuscripcion,
  eliminarSuscripcion
} = require('../controllers/suscripcionController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas requieren estar logueado
router.use(verificarToken);

// 1. Consultar planes (todos los roles)
router.get('/', obtenerSuscripciones);
router.get('/:id', obtenerSuscripcionPorId);

// 2. Crear, modificar y dar de baja planes (solo Administrador)
router.post('/generar-planes', permitirRoles(1), generarPlanes);
router.post('/', permitirRoles(1), crearSuscripcion);
router.put('/:id', permitirRoles(1), actualizarSuscripcion);
router.delete('/:id', permitirRoles(1), eliminarSuscripcion);

// La contratación de una suscripción por parte del alumno se hace
// a través del pago (módulo de pagos), no desde acá.

module.exports = router;