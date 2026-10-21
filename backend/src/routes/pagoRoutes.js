const express = require('express');
const router = express.Router();
const {
  registrarPagoPresencial,
  crearPreferenciaPago,
  confirmarPago,
  verificarPagos,
  recibirWebhook,
  listarPagos,
  obtenerPagoPorId,
  anularPago
} = require('../controllers/pagoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// ==========================================
// 1. WEBHOOK (público: Mercado Pago avisa sin token)
// ==========================================
router.post('/webhook', recibirWebhook);

// A partir de acá todas las rutas requieren estar autenticado
router.use(verificarToken);

// ==========================================
// 2. MERCADO PAGO
// ==========================================
router.post('/crear-preferencia', crearPreferenciaPago); // genera el link de pago
router.post('/confirmar', confirmarPago);                // verificación al volver de Mercado Pago
router.post('/verificar', verificarPagos);               // revisa los pagos iniciados que siguen pendientes

// ==========================================
// 3. CONSULTAS
// ==========================================
// Alumno: su historial. Admin y Profesor: todos los pagos
router.get('/', listarPagos);
router.get('/:id', obtenerPagoPorId);

// ==========================================
// 4. GESTIÓN
// ==========================================
router.post('/', permitirRoles(1, 2), registrarPagoPresencial); // cobro en el gimnasio
router.delete('/:id', permitirRoles(1), anularPago);            // corrección de un cobro erróneo

module.exports = router;