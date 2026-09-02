const express = require('express');
const router = express.Router();
const { registrar, login } = require('../controllers/authController');

// ==========================================
// RUTAS PÚBLICAS DE AUTENTICACIÓN
// ==========================================

// 1. Registro público de nuevos usuarios
router.post('/registro', registrar);

// 2. Inicio de sesión y entrega de token JWT
router.post('/login', login);

module.exports = router;