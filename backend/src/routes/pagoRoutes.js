const express = require('express');
const router = express.Router();
const {
  registrarPago,
  listarPagos,
  obtenerPagoPorId,
  actualizarPago,
  eliminarPago,
  crearPreferenciaPago,
  recibirWebhook
} = require('../controllers/pagoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// ==========================================
// 1. RUTA PÚBLICA DE WEBHOOK
// ==========================================
// Mercado Pago notifica aquí sin token de sesión
router.post('/webhook', recibirWebhook);

// A partir de acá todas las rutas requieren estar autenticado
router.use(verificarToken);

// ==========================================
// 2. RUTAS DE CHECKOUT MERCADO PAGO
// ==========================================
// El socio logueado genera el link para abonar su suscripción
router.post('/crear-preferencia', crearPreferenciaPago);

// ==========================================
// 3. CONSULTAS Y GESTIÓN DE PAGOS
// ==========================================
// Alumnos ven solo sus pagos; Profesores y Admins ven el historial completo
router.get('/', listarPagos);
router.get('/:id', obtenerPagoPorId);

// Cobro manual por mostrador/efectivo (Admin y Profesor)
router.post('/', permitirRoles(1, 2), registrarPago);

// Modificar datos de comprobante (Admin y Profesor)
router.put('/:id', permitirRoles(1, 2), actualizarPago);

// Eliminar comprobante de pago (Exclusivo Administrador)
router.delete('/:id', permitirRoles(1), eliminarPago);

module.exports = router;