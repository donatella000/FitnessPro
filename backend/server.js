const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');

// Importación de todos los módulos de rutas
const authRoutes = require('./src/routes/authRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const claseRoutes = require('./src/routes/claseRoutes');
const turnoRoutes = require('./src/routes/turnoRoutes');
const rutinaRoutes = require('./src/routes/rutinaRoutes');
const suscripcionRoutes = require('./src/routes/suscripcionRoutes');
const pagoRoutes = require('./src/routes/pagoRoutes');
const puntosRoutes = require('./src/routes/puntosRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Montaje de las rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clases', claseRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/rutinas', rutinaRoutes);
app.use('/api/suscripciones', suscripcionRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/puntos', puntosRoutes);

// Ruta de prueba de salud de la API
app.get('/api/saludo', (req, res) => {
  res.json({ mensaje: '¡El backend de FitnessPro está funcionando correctamente!' });
});

// Función de arranque que valida la conexión a la base de datos
const iniciarServidor = async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Conexión exitosa a la base de datos MySQL.');

    app.listen(PORT, () => {
      console.log('🚀 Servidor corriendo en el puerto http://localhost:${PORT}');
    });
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos MySQL:', error.message);
  }
};

iniciarServidor();