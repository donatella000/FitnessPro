const express = require('express');
const router = express.Router();
const {
  registrarPago,
  listarPagos,
  obtenerPagoPorId,
  actualizarPago,
  eliminarPago
} = require('../controllers/pagoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas de pagos requieren estar autenticado
router.use(verificarToken);

// 1. Listar pagos (Alumnos ven los propios, Admin y Profesor ven todos)
router.get('/', listarPagos);

// 2. Obtener un recibo/pago puntual por ID
router.get('/:id', obtenerPagoPorId);

// 3. Registrar un nuevo pago (Admin: 1 y Profesor: 2)
router.post('/', permitirRoles(1, 2), registrarPago);

// 4. Modificar comprobante de pago (Admin: 1 y Profesor: 2)
router.put('/:id', permitirRoles(1, 2), actualizarPago);

// 5. Eliminar comprobante de pago (Exclusivo Administrador: 1)
router.delete('/:id', permitirRoles(1), eliminarPago);

module.exports = router;