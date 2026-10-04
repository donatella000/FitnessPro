const express = require('express');
const router = express.Router();
const { obtenerMiAbono, obtenerEstadisticas } = require('../controllers/dashboardController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Abono del usuario logueado (pantalla principal del alumno)
router.get('/mi-abono', obtenerMiAbono);

// Estadísticas del gimnasio (solo Administrador)
// Opcional: ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (por defecto, últimos 30 días)
router.get('/estadisticas', permitirRoles(1), obtenerEstadisticas);

module.exports = router;