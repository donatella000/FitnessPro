const express = require('express');
const router = express.Router();
const {
  obtenerProductosCanje,
  crearProductoCanje,
  actualizarProductoCanje,
  eliminarProductoCanje,
  consultarSaldoPuntos,
  realizarCanje,
  ajustarPuntosUsuario
} = require('../controllers/puntosController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Todas las rutas requieren estar logueado
router.use(verificarToken);

// 1. Ver catálogo de premios/productos (Alumnos, Profesores y Administradores)
router.get('/catalogo', obtenerProductosCanje);

// 2. Consultar mis puntos actuales (Socio logueado)
router.get('/mi-saldo', consultarSaldoPuntos);

// 3. Canjear un producto (Socio descuenta sus puntos)
router.post('/canjear', realizarCanje);

// 4. Gestión del catálogo de canjes (Exclusivo Administrador: rol 1)
router.post('/catalogo', permitirRoles(1), crearProductoCanje);
router.put('/catalogo/:id', permitirRoles(1), actualizarProductoCanje);
router.delete('/catalogo/:id', permitirRoles(1), eliminarProductoCanje);

// 5. Ajustar saldo de puntos manualmente a cualquier socio (Exclusivo Administrador: rol 1)
router.patch('/ajustar', permitirRoles(1), ajustarPuntosUsuario);

module.exports = router;