const express = require('express');
const router = express.Router();
const {
  registrar,
  login,
  solicitarRecuperacion,
  restablecerPassword,
  cambiarPassword
} = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

// ==========================================
// RUTAS PÚBLICAS DE AUTENTICACIÓN
// ==========================================

// 1. Autoregistro de alumnos
router.post('/registro', registrar);

// 2. Inicio de sesión y entrega de token JWT
router.post('/login', login);

// 3. Solicitar mail de recuperación de contraseña
router.post('/olvide-password', solicitarRecuperacion);

// 4. Restablecer la contraseña usando el token del mail
router.post('/restablecer-password', restablecerPassword);

// ==========================================
// RUTAS PROTEGIDAS (requieren sesión iniciada)
// ==========================================

// 5. Cambiar la contraseña estando logueado (incluye el cambio obligatorio del primer ingreso)
router.put('/cambiar-password', verificarToken, cambiarPassword);

module.exports = router;