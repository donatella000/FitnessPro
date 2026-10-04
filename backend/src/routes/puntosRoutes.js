const express = require('express');
const router = express.Router();
const {
  obtenerPremios,
  crearPremio,
  actualizarPremio,
  eliminarPremio,
  miSaldo,
  movimientosDeUsuario,
  ajustarPuntos,
  canjearPremio,
  listarCanjes,
  entregarCanje
} = require('../controllers/puntosController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// ==========================================
// 1. CATÁLOGO DE PREMIOS  ->  /api/puntos/catalogo
// ==========================================
router.get('/catalogo', obtenerPremios);                                  // todos
router.post('/catalogo', permitirRoles(1, 2), crearPremio);               // admin y profesor
router.put('/catalogo/:id', permitirRoles(1, 2), actualizarPremio);
router.delete('/catalogo/:id', permitirRoles(1, 2), eliminarPremio);

// ==========================================
// 2. SALDO Y CANJES DEL USUARIO LOGUEADO
// ==========================================
router.get('/mi-saldo', miSaldo);
router.post('/canjear', canjearPremio);

// ==========================================
// 3. GESTIÓN (Admin y Profesor)
// ==========================================
router.get('/movimientos/:id_usuario', permitirRoles(1, 2), movimientosDeUsuario);
router.post('/ajustar', permitirRoles(1, 2), ajustarPuntos);
router.get('/canjes', permitirRoles(1, 2), listarCanjes);
router.put('/canjes/:id/entregar', permitirRoles(1, 2), entregarCanje);

module.exports = router;