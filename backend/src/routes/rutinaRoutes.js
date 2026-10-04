const express = require('express');
const router = express.Router();
const {
  obtenerEjercicios,
  crearEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
  miRutina,
  obtenerRutinaDeAlumno,
  crearRutina,
  actualizarRutina,
  actualizarPesos,
  eliminarRutina
} = require('../controllers/rutinaController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// ==========================================
// 1. CATÁLOGO DE EJERCICIOS  ->  /api/rutinas/ejercicios
// ==========================================
router.get('/ejercicios', obtenerEjercicios);
router.post('/ejercicios', permitirRoles(1, 2), crearEjercicio);
router.put('/ejercicios/:id', permitirRoles(1, 2), actualizarEjercicio);
router.delete('/ejercicios/:id', permitirRoles(1, 2), eliminarEjercicio);

// ==========================================
// 2. CONSULTA DE RUTINAS
// ==========================================
router.get('/mia', miRutina);                                                       // alumno logueado
router.get('/alumno/:id_alumno', permitirRoles(1, 2), obtenerRutinaDeAlumno);       // admin y profesor

// ==========================================
// 3. GESTIÓN DE RUTINAS (Admin y Profesor)
// ==========================================
router.post('/', permitirRoles(1, 2), crearRutina);
router.put('/:id', permitirRoles(1, 2), actualizarRutina);
router.delete('/:id', permitirRoles(1, 2), eliminarRutina);

// El alumno puede actualizar los pesos de su propia rutina
router.patch('/:id/pesos', actualizarPesos);

module.exports = router;