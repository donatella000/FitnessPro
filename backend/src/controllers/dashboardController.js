const db = require('../config/db');
const { revisarCumpleanios, esCumpleaniosSQL } = require('../tareas/cumpleanios');

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

    // Si hoy es su cumpleaños y todavía no recibió el regalo, se le da ahora
    await revisarCumpleanios(id_usuario).catch(() => {});

    const [usuarios] = await db.query(`
      SELECT nombre, ${esCumpleaniosSQL('fecha_nacimiento')} AS es_cumpleanios
      FROM usuarios WHERE id_usuario = ?
    `, [id_usuario]);
    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    const esCumpleanios = Boolean(usuarios[0].es_cumpleanios);

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
        es_cumpleanios: esCumpleanios,
        mensaje: 'Todavía no tenés un abono activo.'
      });
    }

    const principal = abonos[0];

    return res.json({
      nombre: usuarios[0].nombre,
      plan: principal.plan,
      vencimiento: principal.vencimiento,
      turnos_restantes: principal.turnos_restantes,
      abonos: abonos.map((a) => ({ ...a, es_renovacion: Boolean(a.es_renovacion) })),
      es_cumpleanios: esCumpleanios
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
    // Se ordenan por asistencias cumplidas en sus clases (no por reservas)
    const [profesores] = await db.query(`
      SELECT u.id_usuario, CONCAT(u.nombre, ' ', u.apellido) AS profesor,
             SUM(t.estado = 'asistido') AS asistencias,
             COUNT(*) AS turnos
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN usuarios u ON c.id_profesor = u.id_usuario
      WHERE u.id_rol = ? AND t.estado <> 'cancelado' AND t.fecha BETWEEN ? AND ?
      GROUP BY u.id_usuario
      ORDER BY asistencias DESC, turnos DESC
    `, [ROL_PROFESOR, desde, hasta]);

    // ---------- Inscripciones nuevas del período ----------
    const [nuevos] = await db.query(`
      SELECT COUNT(*) AS cantidad FROM usuarios
      WHERE id_rol = ? AND DATE(fecha_registro) BETWEEN ? AND ?
    `, [ROL_ALUMNO, desde, hasta]);

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
      profesor_mas_elegido: profesores.length && Number(profesores[0].asistencias) > 0 ? profesores[0].profesor : null,
      nuevos_inscriptos: nuevos[0].cantidad
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener las estadísticas.' });
  }
};

// ==========================================================
// 3. EVOLUCIÓN MES A MES Y AÑO A AÑO (Solo Admin)
// ==========================================================
// GET /api/dashboard/evolucion?anio=2026
// Los datos salen de los registros que ya guarda el sistema (pagos,
// turnos y usuarios), así que el historial se conserva solo.
const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const leerMargen = async () => {
  const [filas] = await db.query("SELECT valor FROM configuracion WHERE clave = 'margen_ingreso_minutos'");
  return filas.length ? Number(filas[0].valor) : 10;
};

// Devuelve el elemento con el mayor valor del campo, o null si todos son cero
const mejor = (lista, campo) => {
  const max = lista.reduce((m, x) => (x[campo] > (m ? m[campo] : 0) ? x : m), null);
  return max ? { mes: max.mes, nombre: max.nombre, valor: max[campo] } : null;
};

const obtenerEvolucion = async (req, res) => {
  try {
    const [hoy] = await db.query('SELECT YEAR(CURDATE()) AS anio, MONTH(CURDATE()) AS mes');
    const anioActual = hoy[0].anio;
    const anio = Number(req.query.anio) || anioActual;
    const margen = await leerMargen();

    const [recaudacion] = await db.query(`
      SELECT MONTH(fecha_pago) AS mes, SUM(monto + recargo) AS total, COUNT(*) AS pagos
      FROM pagos
      WHERE estado = 'aprobado' AND YEAR(fecha_pago) = ?
      GROUP BY MONTH(fecha_pago)
    `, [anio]);

    // Solo turnos que ya pasaron: asistidos contra ausentes
    const [asistencia] = await db.query(`
      SELECT MONTH(t.fecha) AS mes,
             SUM(t.estado = 'asistido') AS asistidos,
             SUM(t.estado = 'reservado') AS ausentes
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE YEAR(t.fecha) = ?
        AND t.estado IN ('asistido', 'reservado')
        AND TIMESTAMP(t.fecha, h.hora_inicio) + INTERVAL ? MINUTE < NOW()
      GROUP BY MONTH(t.fecha)
    `, [anio, margen]);

    const [inscriptos] = await db.query(`
      SELECT MONTH(fecha_registro) AS mes, COUNT(*) AS cantidad
      FROM usuarios
      WHERE id_rol = ? AND YEAR(fecha_registro) = ?
      GROUP BY MONTH(fecha_registro)
    `, [ROL_ALUMNO, anio]);

    const meses = NOMBRES_MESES.map((nombre, i) => {
      const mes = i + 1;
      const r = recaudacion.find((x) => x.mes === mes);
      const a = asistencia.find((x) => x.mes === mes);
      const n = inscriptos.find((x) => x.mes === mes);
      const asistidos = Number(a?.asistidos || 0);
      const ausentes = Number(a?.ausentes || 0);
      return {
        mes,
        nombre,
        futuro: anio > anioActual || (anio === anioActual && mes > hoy[0].mes),
        recaudacion: Number(r?.total || 0),
        pagos: Number(r?.pagos || 0),
        asistidos,
        ausentes,
        porcentaje_asistencia: porcentaje(asistidos, asistidos + ausentes),
        nuevos_inscriptos: Number(n?.cantidad || 0)
      };
    });

    // Totales por año, para comparar año a año
    const [porAnioPagos] = await db.query(`
      SELECT YEAR(fecha_pago) AS anio, SUM(monto + recargo) AS total, COUNT(*) AS pagos
      FROM pagos WHERE estado = 'aprobado'
      GROUP BY YEAR(fecha_pago)
    `);
    const [porAnioAsistencia] = await db.query(`
      SELECT YEAR(t.fecha) AS anio,
             SUM(t.estado = 'asistido') AS asistidos,
             SUM(t.estado = 'reservado') AS ausentes
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE t.estado IN ('asistido', 'reservado')
        AND TIMESTAMP(t.fecha, h.hora_inicio) + INTERVAL ? MINUTE < NOW()
      GROUP BY YEAR(t.fecha)
    `, [margen]);
    const [porAnioInscriptos] = await db.query(`
      SELECT YEAR(fecha_registro) AS anio, COUNT(*) AS cantidad
      FROM usuarios WHERE id_rol = ?
      GROUP BY YEAR(fecha_registro)
    `, [ROL_ALUMNO]);

    const aniosConDatos = new Set([
      anioActual,
      ...porAnioPagos.map((x) => x.anio),
      ...porAnioAsistencia.map((x) => x.anio),
      ...porAnioInscriptos.map((x) => x.anio)
    ]);

    const anios = [...aniosConDatos].sort((a, b) => b - a).map((a) => {
      const p = porAnioPagos.find((x) => x.anio === a);
      const t = porAnioAsistencia.find((x) => x.anio === a);
      const n = porAnioInscriptos.find((x) => x.anio === a);
      const asistidos = Number(t?.asistidos || 0);
      const ausentes = Number(t?.ausentes || 0);
      return {
        anio: a,
        recaudacion: Number(p?.total || 0),
        pagos: Number(p?.pagos || 0),
        asistidos,
        ausentes,
        porcentaje_asistencia: porcentaje(asistidos, asistidos + ausentes),
        nuevos_inscriptos: Number(n?.cantidad || 0)
      };
    });

    return res.json({
      anio,
      meses,
      mejor_mes: {
        recaudacion: mejor(meses, 'recaudacion'),
        asistencias: mejor(meses, 'asistidos'),
        inscripciones: mejor(meses, 'nuevos_inscriptos')
      },
      totales_anio: {
        recaudacion: meses.reduce((t, m) => t + m.recaudacion, 0),
        asistidos: meses.reduce((t, m) => t + m.asistidos, 0),
        ausentes: meses.reduce((t, m) => t + m.ausentes, 0),
        nuevos_inscriptos: meses.reduce((t, m) => t + m.nuevos_inscriptos, 0)
      },
      anios
    });
  } catch (error) {
    console.error('Error al obtener la evolución:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la evolución.' });
  }
};

// ==========================================================
// 4. CLASES DICTADAS (Solo Admin)
// ==========================================================
// GET /api/dashboard/clases-dictadas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&id_actividad=2
// Cada fila es una clase ya finalizada (un horario en una fecha concreta)
// con cuántos alumnos se anotaron y cuántos asistieron.
const obtenerClasesDictadas = async (req, res) => {
  try {
    let { desde, hasta } = req.query;
    const { id_actividad } = req.query;

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

    const condiciones = [
      "t.estado <> 'cancelado'",
      't.fecha BETWEEN ? AND ?',
      'TIMESTAMP(t.fecha, h.hora_fin) < NOW()'
    ];
    const valores = [desde, hasta];
    if (id_actividad) {
      condiciones.push('c.id_actividad = ?');
      valores.push(id_actividad);
    }

    const [clases] = await db.query(`
      SELECT t.id_horario, DATE_FORMAT(t.fecha, '%Y-%m-%d') AS fecha, h.dia_semana,
             h.hora_inicio, h.hora_fin, h.cupo_maximo,
             a.nombre AS actividad, CONCAT(u.nombre, ' ', u.apellido) AS profesor,
             COUNT(*) AS inscriptos,
             SUM(t.estado = 'asistido') AS asistieron
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      LEFT JOIN usuarios u ON c.id_profesor = u.id_usuario
      WHERE ${condiciones.join(' AND ')}
      GROUP BY t.id_horario, t.fecha
      ORDER BY t.fecha DESC, h.hora_inicio DESC
      LIMIT 300
    `, valores);

    return res.json({
      periodo: { desde, hasta },
      clases: clases.map((c) => {
        const asistieron = Number(c.asistieron);
        return {
          ...c,
          dia_nombre: NOMBRES_DIAS[c.dia_semana],
          hora_inicio: String(c.hora_inicio).slice(0, 5),
          hora_fin: String(c.hora_fin).slice(0, 5),
          asistieron,
          porcentaje_asistencia: porcentaje(asistieron, c.inscriptos)
        };
      })
    });
  } catch (error) {
    console.error('Error al obtener clases dictadas:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener las clases dictadas.' });
  }
};

// GET /api/dashboard/clases-dictadas/detalle?id_horario=12&fecha=AAAA-MM-DD
// Lista de alumnos anotados en esa clase y si asistieron.
const obtenerDetalleClaseDictada = async (req, res) => {
  try {
    const { id_horario, fecha } = req.query;
    if (!id_horario || !fecha || !REGEX_FECHA.test(fecha)) {
      return res.status(400).json({ mensaje: 'Debe indicar el horario y la fecha.' });
    }

    const [alumnos] = await db.query(`
      SELECT t.id_turno, u.id_usuario, u.nombre, u.apellido, u.dni, t.estado,
             a.fecha_hora AS ingreso, a.tipo AS tipo_ingreso
      FROM turnos t
      INNER JOIN usuarios u ON t.id_usuario = u.id_usuario
      LEFT JOIN asistencias a ON a.id_turno = t.id_turno
      WHERE t.id_horario = ? AND t.fecha = ?
      ORDER BY (t.estado = 'cancelado'), u.apellido, u.nombre
    `, [id_horario, fecha]);

    return res.json(alumnos.map((al) => ({
      ...al,
      estado: al.estado === 'reservado' ? 'ausente' : al.estado
    })));
  } catch (error) {
    console.error('Error al obtener detalle de la clase:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el detalle de la clase.' });
  }
};

// ==========================================================
// 5. CAMBIAR EL TEMA DE COLORES (Solo Admin)
// ==========================================================
// PUT /api/dashboard/tema  Body: { tema: 'navidad' }
// El tema queda activo hasta que el admin elija otro.
const TEMAS_VALIDOS = [
  'normal', 'navidad', 'anio_nuevo', 'pascuas',
  'patria_25_mayo', 'patria_bandera', 'patria_independencia',
  'mundial', 'primavera', 'halloween'
];

const cambiarTema = async (req, res) => {
  try {
    const { tema } = req.body;
    if (!TEMAS_VALIDOS.includes(tema)) {
      return res.status(400).json({ mensaje: 'El tema elegido no existe.' });
    }

    await db.query(`
      INSERT INTO configuracion (clave, valor, descripcion)
      VALUES ('tema', ?, 'Tema de colores activo del sitio')
      ON DUPLICATE KEY UPDATE valor = VALUES(valor)
    `, [tema]);

    return res.json({ mensaje: 'Tema actualizado.', tema });
  } catch (error) {
    console.error('Error al cambiar el tema:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al cambiar el tema.' });
  }
};

// ==========================================================
// 6. CONFIGURACIÓN GENERAL (Solo Admin)
// ==========================================================
// Valores que el admin puede modificar desde el panel, con sus límites.
const CONFIG_EDITABLE = {
  puntos_por_asistencia: { min: 0, max: 1000 },
  puntos_bienvenida: { min: 0, max: 100000 },
  puntos_cumpleanios: { min: 0, max: 100000 },
  margen_ingreso_minutos: { min: 1, max: 60 },
  limite_reserva_minutos: { min: 0, max: 1440 },
  limite_cancelacion_minutos: { min: 0, max: 2880 },
  dias_visibles_turnos: { min: 1, max: 30 }
};

// GET /api/dashboard/configuracion
const obtenerConfiguracion = async (req, res) => {
  try {
    const [filas] = await db.query(
      'SELECT clave, valor, descripcion FROM configuracion WHERE clave IN (?)',
      [Object.keys(CONFIG_EDITABLE)]
    );
    const config = {};
    for (const clave of Object.keys(CONFIG_EDITABLE)) {
      const fila = filas.find((f) => f.clave === clave);
      config[clave] = fila ? Number(fila.valor) : null;
    }
    return res.json(config);
  } catch (error) {
    console.error('Error al obtener la configuración:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la configuración.' });
  }
};

// PUT /api/dashboard/configuracion  Body: { puntos_por_asistencia: 10, ... }
const actualizarConfiguracion = async (req, res) => {
  try {
    const cambios = Object.entries(req.body).filter(([clave]) => CONFIG_EDITABLE[clave]);
    if (cambios.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron valores para actualizar.' });
    }

    for (const [clave, valor] of cambios) {
      const numero = Number(valor);
      const { min, max } = CONFIG_EDITABLE[clave];
      if (!Number.isInteger(numero) || numero < min || numero > max) {
        return res.status(400).json({ mensaje: `El valor de "${clave}" tiene que ser un número entero entre ${min} y ${max}.` });
      }
    }

    for (const [clave, valor] of cambios) {
      await db.query(`
        INSERT INTO configuracion (clave, valor) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE valor = VALUES(valor)
      `, [clave, String(Number(valor))]);
    }

    return res.json({ mensaje: 'Configuración guardada.' });
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al guardar la configuración.' });
  }
};

module.exports = { obtenerConfiguracion, actualizarConfiguracion, cambiarTema, obtenerMiAbono, obtenerEstadisticas, obtenerEvolucion, obtenerClasesDictadas, obtenerDetalleClaseDictada };
