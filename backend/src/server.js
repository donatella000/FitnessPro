const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

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
      console.log(🚀 Servidor corriendo en el puerto http://localhost:${PORT});
    });
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos MySQL:', error.message);
  }
};

iniciarServidor();