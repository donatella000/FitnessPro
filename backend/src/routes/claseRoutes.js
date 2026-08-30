const express = require('express');
const router = express.Router();
const {
  obtenerClases,
  crearClase,
  actualizarClase,
  eliminarClase,
  agregarHorario,
  actualizarHorario,
  eliminarHorario
} = require('../controllers/claseController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas requieren estar autenticado
router.use(verificarToken);

// 1. Consultar clases y horarios (Disponible para Admin: 1, Profesor: 2, Alumno: 3)
router.get('/', obtenerClases);

// 2. Gestión de clases (Solo Admin: 1 y Profesor: 2)
router.post('/', permitirRoles(1, 2), crearClase);
router.put('/:id', permitirRoles(1, 2), actualizarClase);
router.delete('/:id', permitirRoles(1, 2), eliminarClase);

// 3. Gestión de horarios de clases (Solo Admin: 1 y Profesor: 2)
router.post('/horarios', permitirRoles(1, 2), agregarHorario);
router.put('/horarios/:id', permitirRoles(1, 2), actualizarHorario);
router.delete('/horarios/:id', permitirRoles(1, 2), eliminarHorario);

module.exports = router;