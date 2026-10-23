const express = require('express');
const router = express.Router();
const { obtenerEquipo, obtenerTema } = require('../controllers/publicoController');

// Rutas públicas: no requieren iniciar sesión.
// Las usa la portada para mostrar actividades, profesores y horarios.
router.get('/equipo', obtenerEquipo);
router.get('/tema', obtenerTema);

module.exports = router;
