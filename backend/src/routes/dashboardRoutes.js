const express = require('express');
const router = express.Router();
const { obtenerMiAbono } = require('../controllers/dashboardController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Todas las rutas de acá abajo requieren estar logueado (igual que en turnoRoutes.js)
router.use(verificarToken);

router.get('/mi-abono', obtenerMiAbono);

module.exports = router;
