const db = require('../config/db');
const { revisarCumpleanios, esCumpleaniosSQL } = require('../tareas/cumpleanios');

const ROL_ADMIN = 1;
const ROL_PROFESOR = 2;
const ROL_ALUMNO = 3;

const NOMBRES_DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

// Lee un valor numérico de la tabla configuracion
const leerConfig = async (clave, porDefecto) => {
  const [filas] = await db.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return filas.length ? Number(filas[0].valor) : porDefecto;
};

const esStaff = (usuario) => usuario.id_rol === ROL_ADMIN || usuario.id_rol === ROL_PROFESOR;

// Suma días a una fecha 'YYYY-MM-DD' sin problemas de zona horaria
const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// Día de la semana de una fecha 'YYYY-MM-DD': 1 = lunes ... 7 = domingo
const diaDeSemana = (fecha) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  return ((d.getUTCDay() + 6) % 7) + 1;
};

const hhmm = (hora) => String(hora).slice(0, 5);

// Valida todas las reglas para reservar un turno. Se usa dentro de una transacción.
// Devuelve { error, status } si algo falla, o { id_suscripcion_alumno } si se puede reservar.
// porStaff = true cuando lo asigna un admin/profesor: se saltean la ventana de 7 días
// y el límite de 1 minuto, pero se respetan suscripción, cupo y límites diario y semanal.
const validarReserva = async (conexion, { id_usuario, id_horario, fecha, porStaff }) => {
  if (!id_horario || !fecha || !REGEX_FECHA.test(fecha)) {
    return { status: 400, error: 'Debe indicar el horario y la fecha (AAAA-MM-DD).' };
  }

  // Se bloquea la fila del horario para que dos reservas simultáneas
  // no superen el cupo
  const [horarios] = await conexion.query(`
    SELECT h.id_horario, h.dia_semana, h.hora_inicio, h.cupo_maximo,
           c.id_actividad, a.nombre AS actividad
    FROM horarios_clase h
    INNER JOIN clases c ON h.id_clase = c.id_clase
    INNER JOIN actividades a ON c.id_actividad = a.id_actividad
    WHERE h.id_horario = ? AND h.activo = 1 AND c.activo = 1 AND a.activo = 1
    FOR UPDATE
  `, [id_horario]);

  if (horarios.length === 0) {
    return { status: 404, error: 'El horario no existe o ya no está disponible.' };
  }
  const horario = horarios[0];

  if (diaDeSemana(fecha) !== horario.dia_semana) {
    return { status: 400, error: 'La fecha elegida no corresponde al día de ese horario.' };
  }

  const diasVisibles = await leerConfig('dias_visibles_turnos', 7);
  const limiteReserva = porStaff ? 0 : await leerConfig('limite_reserva_minutos', 1);

  const [tiempos] = await conexion.query(`
    SELECT DATEDIFF(?, CURDATE()) AS diferencia,
           TIMESTAMP(?, ?) > NOW() + INTERVAL ? MINUTE AS a_tiempo
  `, [fecha, fecha, horario.hora_inicio, limiteReserva]);

  const { diferencia, a_tiempo } = tiempos[0];

  if (!porStaff && (diferencia < 0 || diferencia > diasVisibles - 1)) {
    return { status: 400, error: `Solo se puede reservar desde hoy hasta ${diasVisibles - 1} días adelante.` };
  }
  if (!a_tiempo) {
    return {
      status: 400,
      error: porStaff
        ? 'No se puede asignar un turno que ya comenzó.'
        : `La reserva cierra ${limiteReserva} minuto(s) antes del inicio del turno.`
    };
  }

  // Suscripción vigente de esa actividad para la fecha del turno
  const [suscripciones] = await conexion.query(`
    SELECT sa.id_suscripcion_alumno, sa.turnos_totales, sa.turnos_usados, s.veces_por_semana,
      (SELECT COUNT(*) FROM turnos t
        WHERE t.id_suscripcion_alumno = sa.id_suscripcion_alumno
          AND t.estado = 'reservado' AND t.fecha >= CURDATE()) AS reservados
    FROM suscripciones_alumno sa
    INNER JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
    WHERE sa.id_usuario = ? AND s.id_actividad = ?
      AND ? BETWEEN sa.fecha_inicio AND sa.fecha_fin
    ORDER BY sa.fecha_fin ASC
    LIMIT 1
  `, [id_usuario, horario.id_actividad, fecha]);

  if (suscripciones.length === 0) {
    return { status: 403, error: `No hay una suscripción vigente de ${horario.actividad} para esa fecha.` };
  }
  const suscripcion = suscripciones[0];

  if (suscripcion.turnos_usados + suscripcion.reservados >= suscripcion.turnos_totales) {
    return { status: 400, error: 'Ya están reservados todos los turnos que quedan en la suscripción.' };
  }

  // Un turno por día por actividad
  const [delDia] = await conexion.query(`
    SELECT COUNT(*) AS cantidad
    FROM turnos t
    INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
    INNER JOIN clases c ON h.id_clase = c.id_clase
    WHERE t.id_usuario = ? AND t.fecha = ? AND c.id_actividad = ?
      AND t.estado IN ('reservado', 'asistido')
  `, [id_usuario, fecha, horario.id_actividad]);

  if (delDia[0].cantidad > 0) {
    return { status: 400, error: `Ya hay un turno de ${horario.actividad} reservado para ese día.` };
  }

  // Límite de veces por semana (semana de lunes a domingo)
  const [deLaSemana] = await conexion.query(`
    SELECT COUNT(*) AS cantidad
    FROM turnos t
    INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
    INNER JOIN clases c ON h.id_clase = c.id_clase
    WHERE t.id_usuario = ? AND c.id_actividad = ?
      AND YEARWEEK(t.fecha, 1) = YEARWEEK(?, 1)
      AND t.estado IN ('reservado', 'asistido')
  `, [id_usuario, horario.id_actividad, fecha]);

  if (deLaSemana[0].cantidad >= suscripcion.veces_por_semana) {
    return {
      status: 400,
      error: `La suscripción permite ${suscripcion.veces_por_semana} turno(s) de ${horario.actividad} por semana y ya están todos reservados.`
    };
  }

  // Cupo del horario en esa fecha
  const [ocupados] = await conexion.query(`
    SELECT COUNT(*) AS cantidad FROM turnos
    WHERE id_horario = ? AND fecha = ? AND estado IN ('reservado', 'asistido')
  `, [id_horario, fecha]);

  if (ocupados[0].cantidad >= horario.cupo_maximo) {
    return { status: 400, error: 'No queda cupo disponible en ese horario.' };
  }

  return { id_suscripcion_alumno: suscripcion.id_suscripcion_alumno };
};

// Registra la asistencia de un turno: lo marca como asistido, descuenta
// un turno de la suscripción y suma los puntos. Se usa dentro de una transacción.
const registrarAsistencia = async (conexion, { id_turno, tipo, registrado_por = null }) => {
  const [turnos] = await conexion.query(
    'SELECT id_turno, id_usuario, estado, id_suscripcion_alumno FROM turnos WHERE id_turno = ? FOR UPDATE',
    [id_turno]
  );

  if (turnos.length === 0) return { error: 'Turno no encontrado.' };
  const turno = turnos[0];

  if (turno.estado === 'asistido') return { error: 'La asistencia de este turno ya estaba registrada.' };
  if (turno.estado === 'cancelado') return { error: 'El turno está cancelado.' };

  const [abonos] = await conexion.query(
    'SELECT turnos_usados, turnos_totales FROM suscripciones_alumno WHERE id_suscripcion_alumno = ?',
    [turno.id_suscripcion_alumno]
  );
  if (abonos[0] && abonos[0].turnos_usados >= abonos[0].turnos_totales) {
    return { error: 'El abono de este turno ya no tiene turnos disponibles.' };
  }

  const puntos = await leerConfig('puntos_por_asistencia', 0);

  await conexion.query("UPDATE turnos SET estado = 'asistido' WHERE id_turno = ?", [id_turno]);

  await conexion.query(`
    INSERT INTO asistencias (id_turno, id_usuario, tipo, registrado_por, puntos_otorgados)
    VALUES (?, ?, ?, ?, ?)
  `, [id_turno, turno.id_usuario, tipo, registrado_por, puntos]);

  await conexion.query(
    'UPDATE suscripciones_alumno SET turnos_usados = turnos_usados + 1 WHERE id_suscripcion_alumno = ?',
    [turno.id_suscripcion_alumno]
  );

  if (puntos > 0) {
    await conexion.query('UPDATE usuarios SET puntos = puntos + ? WHERE id_usuario = ?', [puntos, turno.id_usuario]);
    await conexion.query(`
      INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, registrado_por)
      VALUES (?, ?, 'asistencia', ?, ?)
    `, [turno.id_usuario, puntos, `Asistencia al turno #${id_turno}`, registrado_por]);
  }

  return { puntos };
};

// Estado que se muestra: un turno reservado cuyo margen de ingreso ya pasó se ve como "ausente"
const estadoVisible = (margen) => `
  CASE
    WHEN t.estado = 'reservado' AND TIMESTAMP(t.fecha, h.hora_inicio) + INTERVAL ${Number(margen)} MINUTE < NOW()
    THEN 'ausente'
    ELSE t.estado
  END
`;

// ==========================================================
// 1. ACTIVIDADES DISPONIBLES PARA EL ALUMNO
// ==========================================================
// Devuelve las actividades de sus suscripciones vigentes, con las clases
// (profesores) que puede elegir. Es el primer paso de la pantalla de turnos.
const misActividades = async (req, res) => {
  try {
    const [suscripciones] = await db.query(`
      SELECT a.id_actividad, a.nombre AS actividad, a.tipo,
             s.nombre AS suscripcion, s.veces_por_semana,
             sa.fecha_inicio, sa.fecha_fin,
             (sa.turnos_totales - sa.turnos_usados) AS turnos_restantes
      FROM suscripciones_alumno sa
      INNER JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
      INNER JOIN actividades a ON s.id_actividad = a.id_actividad
      WHERE sa.id_usuario = ? AND sa.fecha_fin >= CURDATE()
        AND sa.turnos_usados < sa.turnos_totales AND a.activo = 1
      ORDER BY a.nombre, sa.fecha_inicio
    `, [req.usuario.id_usuario]);

    // Una entrada por actividad (si hay una renovación encadenada, se muestra la actual)
    const actividades = [];
    const vistas = new Set();
    for (const s of suscripciones) {
      if (!vistas.has(s.id_actividad)) {
        vistas.add(s.id_actividad);
        actividades.push({ ...s, clases: [] });
      }
    }

    if (actividades.length > 0) {
      const [clases] = await db.query(`
        SELECT c.id_clase, c.id_actividad, c.id_profesor, CONCAT(u.nombre, ' ', u.apellido) AS profesor
        FROM clases c
        LEFT JOIN usuarios u ON c.id_profesor = u.id_usuario
        WHERE c.activo = 1 AND c.id_actividad IN (?)
        ORDER BY profesor
      `, [actividades.map((a) => a.id_actividad)]);

      for (const clase of clases) {
        actividades.find((a) => a.id_actividad === clase.id_actividad).clases.push(clase);
      }
    }

    return res.json(actividades);
  } catch (error) {
    console.error('Error al obtener actividades del alumno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ==========================================================
// 2. DISPONIBILIDAD DE UNA CLASE PARA LOS PRÓXIMOS 7 DÍAS
// ==========================================================
// GET /api/turnos/disponibilidad?id_clase=3
// Devuelve los 7 días (hoy + 6) con sus horarios, el cupo disponible
// y si el usuario logueado ya está anotado o puede anotarse.
const disponibilidad = async (req, res) => {
  try {
    const { id_clase } = req.query;
    const { id_usuario } = req.usuario;

    if (!id_clase) {
      return res.status(400).json({ mensaje: 'Debe indicar la clase.' });
    }

    const [clases] = await db.query(`
      SELECT c.id_clase, c.id_actividad, a.nombre AS actividad, a.tipo,
             CONCAT(u.nombre, ' ', u.apellido) AS profesor
      FROM clases c
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      LEFT JOIN usuarios u ON c.id_profesor = u.id_usuario
      WHERE c.id_clase = ? AND c.activo = 1 AND a.activo = 1
    `, [id_clase]);

    if (clases.length === 0) {
      return res.status(404).json({ mensaje: 'La clase no existe o no está disponible.' });
    }
    const clase = clases[0];

    // El alumno solo ve horarios de las actividades que tiene contratadas
    if (!esStaff(req.usuario)) {
      const [vigentes] = await db.query(`
        SELECT 1 FROM suscripciones_alumno sa
        INNER JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
        WHERE sa.id_usuario = ? AND s.id_actividad = ? AND sa.fecha_fin >= CURDATE()
        LIMIT 1
      `, [id_usuario, clase.id_actividad]);

      if (vigentes.length === 0) {
        return res.status(403).json({ mensaje: `No tenés una suscripción vigente de ${clase.actividad}.` });
      }
    }

    const diasVisibles = await leerConfig('dias_visibles_turnos', 7);
    const limiteReserva = await leerConfig('limite_reserva_minutos', 1);
    const limiteCancelacion = await leerConfig('limite_cancelacion_minutos', 120);

    const [ahora] = await db.query(`
      SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy,
             DATE_FORMAT(NOW() + INTERVAL ? MINUTE, '%Y-%m-%d %H:%i:%s') AS cierre_reserva,
             DATE_FORMAT(NOW() + INTERVAL ? MINUTE, '%Y-%m-%d %H:%i:%s') AS cierre_cancelacion
    `, [limiteReserva, limiteCancelacion]);

    const { hoy, cierre_reserva, cierre_cancelacion } = ahora[0];
    const hasta = sumarDias(hoy, diasVisibles - 1);

    const [horarios] = await db.query(`
      SELECT id_horario, dia_semana, hora_inicio, hora_fin, cupo_maximo
      FROM horarios_clase
      WHERE id_clase = ? AND activo = 1
      ORDER BY dia_semana, hora_inicio
    `, [id_clase]);

    // Ocupación de cada horario en cada fecha del rango
    const [ocupacion] = await db.query(`
      SELECT t.id_horario, t.fecha, COUNT(*) AS ocupados
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE h.id_clase = ? AND t.fecha BETWEEN ? AND ? AND t.estado IN ('reservado', 'asistido')
      GROUP BY t.id_horario, t.fecha
    `, [id_clase, hoy, hasta]);

    // Turnos del usuario en esa actividad dentro del rango
    const [misTurnos] = await db.query(`
      SELECT t.id_turno, t.id_horario, t.fecha
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      WHERE t.id_usuario = ? AND c.id_actividad = ? AND t.fecha BETWEEN ? AND ?
        AND t.estado IN ('reservado', 'asistido')
    `, [id_usuario, clase.id_actividad, hoy, hasta]);

    const ocupadosPor = new Map(ocupacion.map((o) => [`${o.id_horario}|${o.fecha}`, o.ocupados]));

    const dias = [];
    for (let i = 0; i < diasVisibles; i++) {
      const fecha = sumarDias(hoy, i);
      const dia = diaDeSemana(fecha);
      const turnoDelDia = misTurnos.find((t) => t.fecha === fecha);

      dias.push({
        fecha,
        dia_semana: dia,
        dia_nombre: NOMBRES_DIAS[dia],
        ya_tiene_turno: Boolean(turnoDelDia),
        horarios: horarios
          .filter((h) => h.dia_semana === dia)
          .map((h) => {
            const inicio = `${fecha} ${h.hora_inicio}`;
            const ocupados = ocupadosPor.get(`${h.id_horario}|${fecha}`) || 0;
            const miTurno = misTurnos.find((t) => t.fecha === fecha && t.id_horario === h.id_horario);
            const cupo_disponible = Math.max(h.cupo_maximo - ocupados, 0);

            return {
              id_horario: h.id_horario,
              hora_inicio: hhmm(h.hora_inicio),
              hora_fin: hhmm(h.hora_fin),
              cupo_maximo: h.cupo_maximo,
              cupo_disponible,
              reservado_por_mi: Boolean(miTurno),
              id_turno: miTurno ? miTurno.id_turno : null,
              puede_reservar: !turnoDelDia && cupo_disponible > 0 && inicio > cierre_reserva,
              puede_cancelar: Boolean(miTurno) && inicio > cierre_cancelacion
            };
          })
      });
    }

    return res.json({ clase, dias });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la disponibilidad.' });
  }
};

// ==========================================================
// 3. RESERVAR UN TURNO (el usuario logueado, para sí mismo)
// ==========================================================
// Body: { id_horario, fecha: 'AAAA-MM-DD' }
const reservarTurno = async (req, res) => {
  const { id_horario, fecha } = req.body;
  const { id_usuario } = req.usuario;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const validacion = await validarReserva(conexion, { id_usuario, id_horario, fecha, porStaff: false });
    if (validacion.error) {
      await conexion.rollback();
      return res.status(validacion.status).json({ mensaje: validacion.error });
    }

    const [resultado] = await conexion.query(`
      INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha)
      VALUES (?, ?, ?, ?)
    `, [id_usuario, id_horario, validacion.id_suscripcion_alumno, fecha]);

    await conexion.commit();
    return res.status(201).json({ mensaje: '¡Turno reservado!', id_turno: resultado.insertId });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al reservar turno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al reservar el turno.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 4. ASIGNAR UN TURNO A UN ALUMNO (Admin y Profesor)
// ==========================================================
// Body: { id_usuario, id_horario, fecha }
const asignarTurno = async (req, res) => {
  const { id_usuario, id_horario, fecha } = req.body;
  const conexion = await db.getConnection();

  try {
    const [alumno] = await conexion.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = ? AND activo = 1',
      [id_usuario, ROL_ALUMNO]
    );
    if (alumno.length === 0) {
      return res.status(404).json({ mensaje: 'El alumno no existe o está dado de baja.' });
    }

    await conexion.beginTransaction();

    const validacion = await validarReserva(conexion, { id_usuario, id_horario, fecha, porStaff: true });
    if (validacion.error) {
      await conexion.rollback();
      return res.status(validacion.status).json({ mensaje: validacion.error });
    }

    const [resultado] = await conexion.query(`
      INSERT INTO turnos (id_usuario, id_horario, id_suscripcion_alumno, fecha)
      VALUES (?, ?, ?, ?)
    `, [id_usuario, id_horario, validacion.id_suscripcion_alumno, fecha]);

    await conexion.commit();
    return res.status(201).json({ mensaje: 'Turno asignado al alumno.', id_turno: resultado.insertId });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al asignar turno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al asignar el turno.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 5. CANCELAR UN TURNO
// ==========================================================
// El alumno puede cancelar los suyos hasta 2 horas antes (configurable).
// Admin y Profesor pueden cancelar cualquiera mientras no haya comenzado.
const cancelarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = esStaff(req.usuario);
    const limite = staff ? 0 : await leerConfig('limite_cancelacion_minutos', 120);

    const [turnos] = await db.query(`
      SELECT t.id_turno, t.id_usuario, t.estado,
             TIMESTAMP(t.fecha, h.hora_inicio) > NOW() + INTERVAL ? MINUTE AS a_tiempo
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE t.id_turno = ?
    `, [limite, id]);

    if (turnos.length === 0) {
      return res.status(404).json({ mensaje: 'Turno no encontrado.' });
    }
    const turno = turnos[0];

    if (!staff && turno.id_usuario !== req.usuario.id_usuario) {
      return res.status(403).json({ mensaje: 'No podés cancelar el turno de otra persona.' });
    }
    if (turno.estado !== 'reservado') {
      return res.status(400).json({ mensaje: 'Solo se pueden cancelar turnos reservados.' });
    }
    if (!turno.a_tiempo) {
      return res.status(400).json({
        mensaje: staff
          ? 'No se puede cancelar un turno que ya comenzó.'
          : `Los turnos se pueden cancelar hasta ${limite / 60} hora(s) antes del inicio.`
      });
    }

    await db.query(
      "UPDATE turnos SET estado = 'cancelado', fecha_cancelacion = NOW() WHERE id_turno = ?",
      [id]
    );

    return res.json({ mensaje: 'Turno cancelado. El cupo quedó liberado.' });
  } catch (error) {
    console.error('Error al cancelar turno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al cancelar el turno.' });
  }
};

// ==========================================================
// 6. MIS TURNOS (usuario logueado)
// ==========================================================
// ?historial=1 muestra los pasados; por defecto, los de hoy en adelante.
const misTurnos = async (req, res) => {
  try {
    const margen = await leerConfig('margen_ingreso_minutos', 10);
    const limiteCancelacion = await leerConfig('limite_cancelacion_minutos', 120);
    const historial = Boolean(req.query.historial);

    const [turnos] = await db.query(`
      SELECT t.id_turno, t.fecha, h.hora_inicio, h.hora_fin, h.dia_semana,
             a.nombre AS actividad, CONCAT(p.nombre, ' ', p.apellido) AS profesor,
             ${estadoVisible(margen)} AS estado,
             (t.estado = 'reservado' AND TIMESTAMP(t.fecha, h.hora_inicio) > NOW() + INTERVAL ? MINUTE) AS puede_cancelar
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      LEFT JOIN usuarios p ON c.id_profesor = p.id_usuario
      WHERE t.id_usuario = ?
        AND t.estado <> 'cancelado'
        AND t.fecha ${historial ? '<' : '>='} CURDATE()
      ORDER BY t.fecha ${historial ? 'DESC' : 'ASC'}, h.hora_inicio
    `, [limiteCancelacion, req.usuario.id_usuario]);

    return res.json(turnos.map((t) => ({
      ...t,
      dia_nombre: NOMBRES_DIAS[t.dia_semana],
      hora_inicio: hhmm(t.hora_inicio),
      hora_fin: hhmm(t.hora_fin),
      puede_cancelar: Boolean(t.puede_cancelar)
    })));
  } catch (error) {
    console.error('Error al obtener mis turnos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ==========================================================
// 7. LISTAR TURNOS (Admin y Profesor)
// ==========================================================
// Filtros: ?fecha=AAAA-MM-DD (por defecto hoy)  ?id_clase=3  ?id_usuario=8  ?incluirCancelados=1
const listarTurnos = async (req, res) => {
  try {
    const { fecha, id_clase, id_usuario, incluirCancelados } = req.query;
    const margen = await leerConfig('margen_ingreso_minutos', 10);

    const condiciones = [];
    const valores = [];

    if (fecha) {
      condiciones.push('t.fecha = ?');
      valores.push(fecha);
    } else if (!id_usuario) {
      condiciones.push('t.fecha = CURDATE()');
    }
    if (id_clase) {
      condiciones.push('h.id_clase = ?');
      valores.push(id_clase);
    }
    if (id_usuario) {
      condiciones.push('t.id_usuario = ?');
      valores.push(id_usuario);
    }
    if (!incluirCancelados) {
      condiciones.push("t.estado <> 'cancelado'");
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [turnos] = await db.query(`
      SELECT t.id_turno, t.fecha, h.hora_inicio, h.hora_fin,
             u.id_usuario, u.nombre, u.apellido, u.dni,
             a.nombre AS actividad, CONCAT(p.nombre, ' ', p.apellido) AS profesor,
             ${estadoVisible(margen)} AS estado
      FROM turnos t
      INNER JOIN usuarios u ON t.id_usuario = u.id_usuario
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      LEFT JOIN usuarios p ON c.id_profesor = p.id_usuario
      ${where}
      ORDER BY t.fecha DESC, h.hora_inicio, u.apellido
    `, valores);

    return res.json(turnos);
  } catch (error) {
    console.error('Error al listar turnos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al listar los turnos.' });
  }
};

// ==========================================================
// 8. ASISTENCIA MANUAL (Admin y Profesor)
// ==========================================================
// Para cuando el alumno no pudo ingresar por el molinete.
// Solo para turnos cuyo horario ya empezó (nunca para horarios futuros).
const marcarAsistencia = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();

  try {
    const [turnos] = await conexion.query(`
      SELECT TIMESTAMP(t.fecha, h.hora_inicio) <= NOW() AS ya_empezo
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE t.id_turno = ?
    `, [id]);
    if (turnos.length === 0) {
      return res.status(404).json({ mensaje: 'Turno no encontrado.' });
    }
    if (!turnos[0].ya_empezo) {
      return res.status(400).json({ mensaje: 'Solo se puede registrar la asistencia de turnos que ya empezaron.' });
    }

    await conexion.beginTransaction();
    const resultado = await registrarAsistencia(conexion, {
      id_turno: id, tipo: 'manual', registrado_por: req.usuario.id_usuario
    });

    if (resultado.error) {
      await conexion.rollback();
      return res.status(400).json({ mensaje: resultado.error });
    }

    await conexion.commit();
    return res.json({ mensaje: `Asistencia registrada. Se sumaron ${resultado.puntos} punto(s).` });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al marcar asistencia:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al registrar la asistencia.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 8 bis. QUITAR UNA ASISTENCIA (Admin y Profesor)
// ==========================================================
// Corrige una asistencia registrada por error: el turno vuelve a quedar
// como no asistido, se devuelve el turno al abono y se descuentan los
// puntos que se habían sumado (sin dejar el saldo en negativo).
const quitarAsistencia = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [turnos] = await conexion.query(
      'SELECT id_turno, id_usuario, estado, id_suscripcion_alumno FROM turnos WHERE id_turno = ? FOR UPDATE',
      [id]
    );
    if (turnos.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ mensaje: 'Turno no encontrado.' });
    }
    const turno = turnos[0];
    if (turno.estado !== 'asistido') {
      await conexion.rollback();
      return res.status(400).json({ mensaje: 'Este turno no tiene una asistencia registrada.' });
    }

    const [asistencias] = await conexion.query(
      'SELECT id_asistencia, puntos_otorgados FROM asistencias WHERE id_turno = ?',
      [id]
    );
    const puntos = asistencias[0]?.puntos_otorgados || 0;

    await conexion.query("UPDATE turnos SET estado = 'reservado' WHERE id_turno = ?", [id]);
    await conexion.query('DELETE FROM asistencias WHERE id_turno = ?', [id]);
    await conexion.query(
      'UPDATE suscripciones_alumno SET turnos_usados = GREATEST(turnos_usados - 1, 0) WHERE id_suscripcion_alumno = ?',
      [turno.id_suscripcion_alumno]
    );

    let descontados = 0;
    if (puntos > 0) {
      const [usuarios] = await conexion.query('SELECT puntos FROM usuarios WHERE id_usuario = ? FOR UPDATE', [turno.id_usuario]);
      descontados = Math.min(puntos, usuarios[0].puntos);
      if (descontados > 0) {
        await conexion.query('UPDATE usuarios SET puntos = puntos - ? WHERE id_usuario = ?', [descontados, turno.id_usuario]);
        await conexion.query(`
          INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, registrado_por)
          VALUES (?, ?, 'ajuste', ?, ?)
        `, [turno.id_usuario, -descontados, `Asistencia anulada del turno #${id}`, req.usuario.id_usuario]);
      }
    }

    await conexion.commit();
    return res.json({
      mensaje: `Asistencia quitada. Se devolvió el turno al abono${descontados ? ` y se descontaron ${descontados} punto(s)` : ''}.`
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al quitar asistencia:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al quitar la asistencia.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 9. MOLINETE: INGRESO POR DNI (pantalla de la entrada, sin login)
// ==========================================================
// Si en el .env está definida MOLINETE_CLAVE, la pantalla del molinete
// tiene que mandarla en el encabezado 'x-molinete-clave'. Así nadie puede
// registrar asistencias desde otra computadora.
const ingresoMolinete = async (req, res) => {
  const conexion = await db.getConnection();

  try {
    if (process.env.MOLINETE_CLAVE && req.headers['x-molinete-clave'] !== process.env.MOLINETE_CLAVE) {
      return res.status(401).json({ acceso: false, mensaje: 'Dispositivo no autorizado.' });
    }

    const { dni } = req.body;
    if (!dni || !/^\d{6,10}$/.test(String(dni))) {
      return res.status(400).json({ acceso: false, mensaje: 'Ingresá tu DNI sin puntos.' });
    }

    const [usuarios] = await conexion.query(
      `SELECT id_usuario, nombre, id_rol, ${esCumpleaniosSQL('fecha_nacimiento')} AS es_cumpleanios
       FROM usuarios WHERE dni = ? AND activo = 1`,
      [dni]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ acceso: false, mensaje: 'El DNI no corresponde a un alumno registrado.' });
    }
    const usuario = usuarios[0];

    // Admin y profesores ingresan sin turno
    if (usuario.id_rol !== ROL_ALUMNO) {
      await conexion.query('INSERT INTO aperturas_molinete (id_usuario) VALUES (?)', [usuario.id_usuario]);
      return res.json({ acceso: true, mensaje: `¡Hola ${usuario.nombre}!` });
    }

    // Suscripción activa
    const [vigentes] = await conexion.query(`
      SELECT 1 FROM suscripciones_alumno
      WHERE id_usuario = ? AND CURDATE() BETWEEN fecha_inicio AND fecha_fin
        AND turnos_usados < turnos_totales
      LIMIT 1
    `, [usuario.id_usuario]);

    if (vigentes.length === 0) {
      return res.status(403).json({ acceso: false, mensaje: 'No tenés una suscripción activa. Acercate a recepción.' });
    }

    const margen = await leerConfig('margen_ingreso_minutos', 10);

    // Turno reservado para hoy dentro del margen de ingreso
    const [turnos] = await conexion.query(`
      SELECT t.id_turno
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN suscripciones_alumno sa ON t.id_suscripcion_alumno = sa.id_suscripcion_alumno
      WHERE t.id_usuario = ? AND t.fecha = CURDATE() AND t.estado = 'reservado'
        AND NOW() BETWEEN TIMESTAMP(t.fecha, h.hora_inicio) - INTERVAL ? MINUTE
                      AND TIMESTAMP(t.fecha, h.hora_inicio) + INTERVAL ? MINUTE
        AND CURDATE() BETWEEN sa.fecha_inicio AND sa.fecha_fin
        AND sa.turnos_usados < sa.turnos_totales
      ORDER BY h.hora_inicio
      LIMIT 1
    `, [usuario.id_usuario, margen, margen]);

    if (turnos.length === 0) {
      // Buscar si tiene algún turno hoy, para explicar el motivo
      const [deHoy] = await conexion.query(`
        SELECT h.hora_inicio
        FROM turnos t
        INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
        WHERE t.id_usuario = ? AND t.fecha = CURDATE() AND t.estado = 'reservado'
          AND TIMESTAMP(t.fecha, h.hora_inicio) + INTERVAL ? MINUTE >= NOW()
        ORDER BY h.hora_inicio
        LIMIT 1
      `, [usuario.id_usuario, margen]);

      const mensaje = deHoy.length
        ? `Tu turno es a las ${hhmm(deHoy[0].hora_inicio)}. Podés ingresar desde ${margen} minutos antes hasta ${margen} minutos después.`
        : 'No tenés un turno reservado para este horario.';

      return res.status(403).json({ acceso: false, mensaje });
    }

    await conexion.beginTransaction();
    const resultado = await registrarAsistencia(conexion, { id_turno: turnos[0].id_turno, tipo: 'molinete' });

    if (resultado.error) {
      await conexion.rollback();
      return res.status(400).json({ acceso: false, mensaje: resultado.error });
    }

    await conexion.commit();

    // En su cumpleaños, el molinete lo saluda y se asegura de que tenga su regalo
    const cumpleanios = Boolean(usuario.es_cumpleanios);
    if (cumpleanios) {
      await revisarCumpleanios(usuario.id_usuario).catch(() => {});
    }

    return res.json({
      acceso: true,
      mensaje: `¡Hola ${usuario.nombre}! ¡Buen entrenamiento!`,
      puntos_ganados: resultado.puntos,
      cumpleanios
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error en ingreso por molinete:', error);
    return res.status(500).json({ acceso: false, mensaje: 'Error del sistema. Acercate a recepción.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 10. MOLINETE: APERTURA MANUAL (Admin y Profesor desde su panel)
// ==========================================================
const aperturaManual = async (req, res) => {
  try {
    await db.query('INSERT INTO aperturas_molinete (id_usuario) VALUES (?)', [req.usuario.id_usuario]);
    return res.json({ acceso: true, mensaje: 'Molinete abierto.' });
  } catch (error) {
    console.error('Error en apertura manual:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al abrir el molinete.' });
  }
};

module.exports = {
  misActividades,
  disponibilidad,
  reservarTurno,
  asignarTurno,
  cancelarTurno,
  misTurnos,
  listarTurnos,
  marcarAsistencia,
  quitarAsistencia,
  ingresoMolinete,
  aperturaManual
};
