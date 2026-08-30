const express = require('express');
const router = express.Router();
const {
  reservarTurno,
  asignarTurnoManual,
  cancelarTurno,
  listarTurnos,
  actualizarAsistencia,
  validarAccesoMolinete
} = require('../controllers/turnoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// 1. Endpoint público para la terminal del molinete físico
router.post('/molinete/acceso', validarAccesoMolinete);

// 2. Rutas protegidas por JWT
router.use(verificarToken);

// Listar turnos (Alumnos ven los propios, Admin y Profesor ven todos)
router.get('/', listarTurnos);

// Reservar turno propio (Alumno)
router.post('/reservar', reservarTurno);

// Asignar turno manual a un alumno (Admin: 1 y Profesor: 2)
router.post('/asignar', permitirRoles(1, 2), asignarTurnoManual);

// Cancelar turno
router.delete('/:id', cancelarTurno);

// Marcar asistencia manual (Admin: 1 y Profesor: 2)
router.patch('/:id/asistencia', permitirRoles(1, 2), actualizarAsistencia);

module.exports = router;