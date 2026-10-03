const express = require('express');
const router = express.Router();
const { registrar, login, solicitarRecuperacion, restablecerPassword } = require('../controllers/authController');

// ==========================================
// RUTAS PÚBLICAS DE AUTENTICACIÓN
// ==========================================

// 1. Registro público de nuevos usuarios
router.post('/registro', registrar);

// 2. Inicio de sesión y entrega de token JWT
router.post('/login', login);

// 3. Solicitar mail de recuperación de contraseña
router.post('/olvide-password', solicitarRecuperacion);

// 4. Restablecer la contraseña usando el token del mail
router.post('/restablecer-password', restablecerPassword);

module.exports = router;