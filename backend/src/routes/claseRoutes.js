const express = require('express');
const router = express.Router();
const {
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  obtenerClases,
  crearClase,
  actualizarClase,
  eliminarClase,
  agregarHorario,
  generarHorarios,
  actualizarHorario,
  eliminarHorario
} = require('../controllers/claseController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas requieren estar autenticado
router.use(verificarToken);

// Importante: las rutas con palabras fijas (/actividades, /horarios)
// van antes que las que usan /:id, para que Express no las confunda.

// ==========================================
// 1. ACTIVIDADES  ->  /api/clases/actividades
// ==========================================
router.get('/actividades', obtenerActividades);                         // todos
router.post('/actividades', permitirRoles(1), crearActividad);          // admin
router.put('/actividades/:id', permitirRoles(1), actualizarActividad);  // admin
router.delete('/actividades/:id', permitirRoles(1), eliminarActividad); // admin

// ==========================================
// 2. HORARIOS  ->  /api/clases/horarios
// ==========================================
// Admin: cualquier clase. Profesor: solo las suyas (se valida en el controller)
router.post('/horarios', permitirRoles(1, 2), agregarHorario);
router.post('/horarios/generar', permitirRoles(1, 2), generarHorarios);
router.put('/horarios/:id', permitirRoles(1, 2), actualizarHorario);
router.delete('/horarios/:id', permitirRoles(1, 2), eliminarHorario);

// ==========================================
// 3. CLASES  ->  /api/clases
// ==========================================
router.get('/', obtenerClases);                                // todos
router.post('/', permitirRoles(1, 2), crearClase);             // admin elige profe; profe se asigna a sí mismo
router.put('/:id', permitirRoles(1), actualizarClase);         // admin: reasignar profesor
router.delete('/:id', permitirRoles(1, 2), eliminarClase);     // admin o el profe dueño

module.exports = router;