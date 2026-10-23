const express = require('express');
const router = express.Router();
const {
  obtenerMiAbono,
  obtenerEstadisticas,
  obtenerEvolucion,
  obtenerClasesDictadas,
  obtenerDetalleClaseDictada,
  cambiarTema,
  obtenerConfiguracion,
  actualizarConfiguracion
} = require('../controllers/dashboardController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Abono del usuario logueado (pantalla principal del alumno)
router.get('/mi-abono', obtenerMiAbono);

// Estadísticas del gimnasio (solo Administrador)
router.get('/estadisticas', permitirRoles(1), obtenerEstadisticas);              // ?desde=&hasta=
router.get('/evolucion', permitirRoles(1), obtenerEvolucion);                    // ?anio=2026
router.get('/clases-dictadas', permitirRoles(1), obtenerClasesDictadas);         // ?desde=&hasta=&id_actividad=
router.get('/clases-dictadas/detalle', permitirRoles(1), obtenerDetalleClaseDictada); // ?id_horario=&fecha=

// Tema de colores del sitio (solo Administrador)
router.put('/tema', permitirRoles(1), cambiarTema);

// Configuración general: puntos y reglas de turnos (solo Administrador)
router.get('/configuracion', permitirRoles(1), obtenerConfiguracion);
router.put('/configuracion', permitirRoles(1), actualizarConfiguracion);

module.exports = router;
