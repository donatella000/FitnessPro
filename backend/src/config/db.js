const mysql = require('mysql2/promise');
// dotenv ya se carga en server.js, no hace falta cargarlo de nuevo acá

// Crear el grupo (pool) de conexiones reutilizables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gimnasio',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Devuelve las fechas como texto ('2026-10-04') en lugar de objetos Date.
  // Evita que una fecha aparezca corrida un día en el frontend por la zona horaria.
  dateStrings: true
});

module.exports = pool;