const express = require('express');
const router = express.Router();
const { obtenerEquipo } = require('../controllers/publicoController');

// Rutas públicas: no requieren iniciar sesión.
// Las usa la portada para mostrar actividades, profesores y horarios.
router.get('/equipo', obtenerEquipo);

module.exports = router;