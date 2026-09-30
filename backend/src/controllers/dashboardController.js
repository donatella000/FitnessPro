const db = require('../config/db');

// GET /api/dashboard/mi-abono
// Colgado detrás de verificarToken (ver dashboardRoutes.js), así que req.usuario
// ya existe cuando se llega acá. No recibe id_usuario por parámetro a propósito:
// así un alumno nunca puede pedir el abono de otra persona.
const obtenerMiAbono = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const [usuarios] = await db.query(
      'SELECT nombre FROM usuarios WHERE id_usuario = ?',
      [id_usuario]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Último pago vigente (o el más reciente si ninguno está vigente hoy)
    const [pagos] = await db.query(`
      SELECT p.fecha_inicio_validez, p.fecha_fin_validez,
             s.descripcion AS plan, s.veces_por_mes
      FROM pagos p
      INNER JOIN suscripcion s ON s.id_suscripcion = p.id_suscripcion
      WHERE p.id_usuario = ?
      ORDER BY (p.fecha_fin_validez >= CURDATE()) DESC, p.fecha_pago DESC
      LIMIT 1
    `, [id_usuario]);

    if (pagos.length === 0) {
      return res.json({
        nombre: usuarios[0].nombre,
        plan: null,
        vencimiento: null,
        turnos_restantes: null,
        mensaje: 'Todavía no tenés un abono cargado.'
      });
    }

    const pago = pagos[0];

    // Cuántas veces ya asistió DENTRO del período que pagó (tabla "asistencias",
    // ver server/db/003_crear_tabla_asistencias.sql)
    const [usados] = await db.query(
      `SELECT COUNT(*) AS cantidad FROM asistencias
       WHERE id_usuario = ? AND fecha BETWEEN ? AND ?`,
      [id_usuario, pago.fecha_inicio_validez, pago.fecha_fin_validez]
    );

    const turnosRestantes = Math.max(pago.veces_por_mes - usados[0].cantidad, 0);

    return res.json({
      nombre: usuarios[0].nombre,
      plan: pago.plan,
      vencimiento: pago.fecha_fin_validez,
      turnos_restantes: turnosRestantes
    });
  } catch (error) {
    console.error('Error al obtener el dashboard:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el dashboard' });
  }
};

module.exports = { obtenerMiAbono };
