const db = require('../config/db');

const ROL_PROFESOR = 2;
const ROL_ALUMNO = 3;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const NOMBRES_DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);

// ==========================================================
// 1. MI ABONO (usuario logueado)
// ==========================================================
// Devuelve todas las suscripciones vigentes en "abonos".
// Los campos plan, vencimiento y turnos_restantes corresponden a la primera,
// para que la pantalla actual del Dashboard siga funcionando sin cambios.
const obtenerMiAbono = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;

    const [usuarios] = await db.query('SELECT nombre FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const [abonos] = await db.query(`
      SELECT sa.id_suscripcion_alumno, s.nombre AS plan, a.nombre AS actividad,
             s.veces_por_semana, sa.fecha_inicio, sa.fecha_fin AS vencimiento,
             sa.turnos_totales, sa.turnos_usados,
             (sa.turnos_totales - sa.turnos_usados) AS turnos_restantes,
             (sa.fecha_inicio > CURDATE()) AS es_renovacion
      FROM suscripciones_alumno sa
      INNER JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
      INNER JOIN actividades a ON s.id_actividad = a.id_actividad
      WHERE sa.id_usuario = ? AND sa.fecha_fin >= CURDATE() AND sa.turnos_usados < sa.turnos_totales
      ORDER BY sa.fecha_inicio, a.nombre
    `, [id_usuario]);

    if (abonos.length === 0) {
      return res.json({
        nombre: usuarios[0].nombre,
        plan: null,
        vencimiento: null,
        turnos_restantes: null,
        abonos: [],
        mensaje: 'Todavía no tenés un abono activo.'
      });
    }

    const principal = abonos[0];

    return res.json({
      nombre: usuarios[0].nombre,
      plan: principal.plan,
      vencimiento: principal.vencimiento,
      turnos_restantes: principal.turnos_restantes,
      abonos: abonos.map((a) => ({ ...a, es_renovacion: Boolean(a.es_renovacion) }))
    });
  } catch (error) {
    console.error('Error al obtener el abono:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el abono.' });
  }
};

// ==========================================================
// 2. ESTADÍSTICAS DEL GIMNASIO (Solo Admin)
// ==========================================================
// GET /api/dashboard/estadisticas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
// El período se aplica a asistencias, pagos, canjes y turnos.
// Por defecto: los últimos 30 días.
// Los datos de perfil (sexo y edades) son de los alumnos activos, sin período.
const obtenerEstadisticas = async (req, res) => {
  try {
    let { desde, hasta } = req.query;

    if ((desde && !REGEX_FECHA.test(desde)) || (hasta && !REGEX_FECHA.test(hasta))) {
      return res.status(400).json({ mensaje: 'Las fechas deben tener el formato AAAA-MM-DD.' });
    }

    if (!desde || !hasta) {
      const [rango] = await db.query(`
        SELECT DATE_FORMAT(CURDATE() - INTERVAL 30 DAY, '%Y-%m-%d') AS desde,
               DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hasta
      `);
      desde = desde || rango[0].desde;
      hasta = hasta || rango[0].hasta;
    }

    const [margenConfig] = await db.query(
      "SELECT valor FROM configuracion WHERE clave = 'margen_ingreso_minutos'"
    );
    const margen = margenConfig.length ? Number(margenConfig[0].valor) : 10;

    // ---------- Alumnos: inscriptos vs activos ----------
    const [alumnos] = await db.query(`
      SELECT
        COUNT(*) AS inscriptos,
        SUM(EXISTS (
          SELECT 1 FROM suscripciones_alumno sa
          WHERE sa.id_usuario = u.id_usuario
            AND CURDATE() BETWEEN sa.fecha_inicio AND sa.fecha_fin
            AND sa.turnos_usados < sa.turnos_totales
        )) AS activos
      FROM usuarios u
      WHERE u.id_rol = ? AND u.activo = 1
    `, [ROL_ALUMNO]);

    const inscriptos = Number(alumnos[0].inscriptos);
    const activos = Number(alumnos[0].activos || 0);

    // ---------- Sexo ----------
    const [sexos] = await db.query(`
      SELECT COALESCE(sexo, 'Sin dato') AS sexo, COUNT(*) AS cantidad
      FROM usuarios
      WHERE id_rol = ? AND activo = 1
      GROUP BY COALESCE(sexo, 'Sin dato')
    `, [ROL_ALUMNO]);

    const distribucionSexo = sexos.map((s) => ({
      sexo: s.sexo,
      cantidad: s.cantidad,
      porcentaje: porcentaje(s.cantidad, inscriptos)
    }));

    // ---------- Edades ----------
    const [edades] = await db.query(`
      SELECT
        CASE
          WHEN edad < 18 THEN 'Menos de 18'
          WHEN edad BETWEEN 18 AND 25 THEN '18 a 25'
          WHEN edad BETWEEN 26 AND 35 THEN '26 a 35'
          WHEN edad BETWEEN 36 AND 45 THEN '36 a 45'
          WHEN edad BETWEEN 46 AND 60 THEN '46 a 60'
          ELSE 'Más de 60'
        END AS rango,
        MIN(edad) AS orden,
        COUNT(*) AS cantidad
      FROM (
        SELECT TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad
        FROM usuarios
        WHERE id_rol = ? AND activo = 1 AND fecha_nacimiento IS NOT NULL
      ) AS e
      GROUP BY rango
      ORDER BY orden
    `, [ROL_ALUMNO]);

    const [promedioEdad] = await db.query(`
      SELECT ROUND(AVG(TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE())), 1) AS promedio,
             COUNT(*) AS con_dato
      FROM usuarios
      WHERE id_rol = ? AND activo = 1 AND fecha_nacimiento IS NOT NULL
    `, [ROL_ALUMNO]);

    const rangoPredominante = edades.reduce(
      (max, r) => (!max || r.cantidad > max.cantidad ? r : max), null
    );

    // ---------- Asistencia efectiva ----------
    // Turnos ya pasados del período: cuántos asistieron y cuántos faltaron
    const [asistencia] = await db.query(`
      SELECT
        SUM(t.estado = 'asistido') AS asistidos,
        SUM(t.estado = 'reservado') AS ausentes
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE t.fecha BETWEEN ? AND ?
        AND t.estado IN ('asistido', 'reservado')
        AND TIMESTAMP(t.fecha, h.hora_inicio) + INTERVAL ? MINUTE < NOW()
    `, [desde, hasta, margen]);

    const asistidos = Number(asistencia[0].asistidos || 0);
    const ausentes = Number(asistencia[0].ausentes || 0);

    // ---------- Suscripciones más elegidas ----------
    const [suscripciones] = await db.query(`
      SELECT s.nombre AS suscripcion, a.nombre AS actividad,
             COUNT(*) AS cantidad, SUM(p.monto + p.recargo) AS recaudado
      FROM pagos p
      INNER JOIN suscripciones s ON p.id_suscripcion = s.id_suscripcion
      INNER JOIN actividades a ON s.id_actividad = a.id_actividad
      WHERE p.estado = 'aprobado' AND DATE(p.fecha_pago) BETWEEN ? AND ?
      GROUP BY s.id_suscripcion, a.id_actividad
      ORDER BY cantidad DESC
    `, [desde, hasta]);

    const recaudacionTotal = suscripciones.reduce((total, s) => total + Number(s.recaudado), 0);

    // ---------- Premios más canjeados ----------
    const [premios] = await db.query(`
      SELECT p.nombre AS premio, COUNT(*) AS cantidad, SUM(c.puntos_usados) AS puntos
      FROM canjes c
      INNER JOIN premios p ON c.id_premio = p.id_premio
      WHERE DATE(c.fecha) BETWEEN ? AND ?
      GROUP BY p.id_premio
      ORDER BY cantidad DESC
    `, [desde, hasta]);

    // ---------- Horarios más concurridos por actividad ----------
    const [horarios] = await db.query(`
      SELECT a.nombre AS actividad, h.dia_semana, h.hora_inicio, h.hora_fin,
             COUNT(*) AS asistencias
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      WHERE t.estado = 'asistido' AND t.fecha BETWEEN ? AND ?
      GROUP BY a.id_actividad, h.dia_semana, h.hora_inicio, h.hora_fin
      ORDER BY a.nombre, asistencias DESC
    `, [desde, hasta]);

    // Los 3 horarios con más asistencias de cada actividad
    const horariosPorActividad = {};
    for (const h of horarios) {
      if (!horariosPorActividad[h.actividad]) horariosPorActividad[h.actividad] = [];
      if (horariosPorActividad[h.actividad].length < 3) {
        horariosPorActividad[h.actividad].push({
          dia: NOMBRES_DIAS[h.dia_semana],
          horario: `${String(h.hora_inicio).slice(0, 5)} a ${String(h.hora_fin).slice(0, 5)}`,
          asistencias: h.asistencias
        });
      }
    }

    // ---------- Profesores más elegidos ----------
    // Cantidad de turnos reservados en sus clases (sin cancelados)
    const [profesores] = await db.query(`
      SELECT u.id_usuario, CONCAT(u.nombre, ' ', u.apellido) AS profesor,
             COUNT(*) AS turnos, SUM(t.estado = 'asistido') AS asistencias
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN usuarios u ON c.id_profesor = u.id_usuario
      WHERE u.id_rol = ? AND t.estado <> 'cancelado' AND t.fecha BETWEEN ? AND ?
      GROUP BY u.id_usuario
      ORDER BY turnos DESC
    `, [ROL_PROFESOR, desde, hasta]);

    return res.json({
      periodo: { desde, hasta },
      alumnos: {
        inscriptos,
        activos,
        porcentaje_activos: porcentaje(activos, inscriptos)
      },
      sexo: distribucionSexo,
      edades: {
        rangos: edades.map(({ rango, cantidad }) => ({ rango, cantidad })),
        rango_predominante: rangoPredominante ? rangoPredominante.rango : null,
        promedio: promedioEdad[0].promedio === null ? null : Number(promedioEdad[0].promedio),
        alumnos_sin_fecha_nacimiento: inscriptos - promedioEdad[0].con_dato
      },
      asistencia: {
        asistidos,
        ausentes,
        porcentaje_asistencia: porcentaje(asistidos, asistidos + ausentes)
      },
      suscripciones_mas_elegidas: suscripciones.map((s) => ({ ...s, recaudado: Number(s.recaudado) })),
      recaudacion_total: recaudacionTotal,
      premios_mas_canjeados: premios.map((p) => ({ ...p, puntos: Number(p.puntos) })),
      horarios_mas_concurridos: horariosPorActividad,
      profesores_mas_elegidos: profesores.map((p) => ({ ...p, asistencias: Number(p.asistencias) })),
      profesor_mas_elegido: profesores.length ? profesores[0].profesor : null
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener las estadísticas.' });
  }
};

module.exports = { obtenerMiAbono, obtenerEstadisticas };