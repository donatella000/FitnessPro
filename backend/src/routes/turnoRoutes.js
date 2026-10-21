const express = require('express');
const router = express.Router();
const {
  misActividades,
  disponibilidad,
  reservarTurno,
  asignarTurno,
  cancelarTurno,
  misTurnos,
  listarTurnos,
  marcarAsistencia,
  quitarAsistencia,
  ingresoMolinete,
  aperturaManual
} = require('../controllers/turnoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// ==========================================
// 1. MOLINETE: INGRESO POR DNI (sin login)
// ==========================================
router.post('/molinete/ingreso', ingresoMolinete);

// A partir de acá todas las rutas requieren estar autenticado
router.use(verificarToken);

// ==========================================
// 2. MOLINETE: APERTURA MANUAL (Admin y Profesor)
// ==========================================
router.post('/molinete/apertura', permitirRoles(1, 2), aperturaManual);

// ==========================================
// 3. PANTALLA DE TURNOS DEL ALUMNO
// ==========================================
router.get('/mis-actividades', misActividades);   // actividades contratadas y sus profesores
router.get('/disponibilidad', disponibilidad);    // grilla de 7 días de una clase (?id_clase=)
router.get('/mis-turnos', misTurnos);             // próximos (o ?historial=1)
router.post('/', reservarTurno);                  // reservar para sí mismo
router.delete('/:id', cancelarTurno);             // cancelar (alumno: los suyos, hasta 2 hs antes)

// ==========================================
// 4. GESTIÓN (Admin y Profesor)
// ==========================================
router.get('/', permitirRoles(1, 2), listarTurnos);                         // turnos del día y filtros
router.post('/asignar', permitirRoles(1, 2), asignarTurno);                 // anotar a un alumno
router.post('/:id/asistencia', permitirRoles(1, 2), marcarAsistencia);      // marcar presente (solo horarios ya empezados)
router.delete('/:id/asistencia', permitirRoles(1, 2), quitarAsistencia);    // corregir: marcar ausente

module.exports = router;