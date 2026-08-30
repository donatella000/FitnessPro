const express = require('express');
const router = express.Router();
const {
  obtenerEjercicios,
  crearEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
  obtenerRutinaPorUsuario,
  crearRutina,
  actualizarRutinaCompleta,
  actualizarPesosRutina,
  eliminarRutina
} = require('../controllers/rutinaController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// ==========================================
// Rutas de Catálogo de Ejercicios
// ==========================================
router.get('/ejercicios', obtenerEjercicios);
router.post('/ejercicios', permitirRoles(1, 2), crearEjercicio);
router.put('/ejercicios/:id', permitirRoles(1, 2), actualizarEjercicio);
router.delete('/ejercicios/:id', permitirRoles(1, 2), eliminarEjercicio);

// ==========================================
// Rutas de Rutinas
// ==========================================
// Consultar rutina de un usuario (Admin/Profesor ven de cualquiera, Alumno solo la suya)
router.get('/usuario/:id_usuario', obtenerRutinaPorUsuario);

// Crear rutina completa para un alumno (Admin y Profesor)
router.post('/', permitirRoles(1, 2), crearRutina);

// Actualizar rutina completa (Admin y Profesor)
router.put('/:id', permitirRoles(1, 2), actualizarRutinaCompleta);

// Actualizar exclusivamente los pesos de la rutina (Permitido para Alumnos, Profesores y Admin)
router.patch('/:id/pesos', actualizarPesosRutina);

// Eliminar rutina (Admin y Profesor)
router.delete('/:id', permitirRoles(1, 2), eliminarRutina);

module.exports = router;