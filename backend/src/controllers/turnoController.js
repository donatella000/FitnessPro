const db = require('../config/db');

// Función auxiliar para obtener el nombre del día en español
const obtenerDiaSemanaEspanol = () => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date().getDay()];
};

// 1. Reservar turno (Alumno) con validación de pago y cupo
const reservarTurno = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;
    const { id_horario } = req.body;

    if (!id_horario) {
      return res.status(400).json({ mensaje: 'Debe seleccionar un horario para reservar' });
    }

    // A. Validar que el usuario tenga suscripción y cuota al día en la tabla "pagos"
    const hoy = new Date().toISOString().slice(0, 10);
    const [pagosValidos] = await db.query(`
      SELECT p.id_pagos, p.id_suscripcion, s.id_clase, s.veces_por_mes
      FROM pagos p
      INNER JOIN suscripcion s ON p.id_suscripcion = s.id_suscripcion
      WHERE p.id_usuario = ? 
        AND ? BETWEEN p.fecha_inicio_validez AND p.fecha_fin_validez
      ORDER BY p.fecha_fin_validez DESC
      LIMIT 1
    `, [id_usuario, hoy]);

    if (pagosValidos.length === 0) {
      return res.status(403).json({ 
        mensaje: 'No podés reservar un turno: Tu cuota no se encuentra al día o tu suscripción está vencida.' 
      });
    }

    const suscripcionActiva = pagosValidos[0];

    // B. Verificar que el horario pertenezca a la clase de su suscripción y tenga cupo libre
    const [horarios] = await db.query(
      'SELECT id_horario, id_clase, cupo_libre FROM horarios_clase WHERE id_horario = ?',
      [id_horario]
    );

    if (horarios.length === 0) {
      return res.status(404).json({ mensaje: 'El horario seleccionado no existe' });
    }

    const horario = horarios[0];

    if (horario.id_clase !== suscripcionActiva.id_clase) {
      return res.status(400).json({ mensaje: 'El horario no corresponde a la disciplina de tu suscripción actual' });
    }

    if (horario.cupo_libre <= 0) {
      return res.status(400).json({ mensaje: 'No hay cupo disponible para este horario' });
    }

    // C. Verificar si ya tiene reservado ese mismo turno
    const [turnoExistente] = await db.query(
      'SELECT id_turno FROM turnos WHERE id_usuario = ? AND id_horario = ?',
      [id_usuario, id_horario]
    );

    if (turnoExistente.length > 0) {
      return res.status(400).json({ mensaje: 'Ya tenés un turno reservado en este horario' });
    }

    // D. Registrar el turno y descontar 1 del cupo disponible
    await db.query(
      'INSERT INTO turnos (id_usuario, id_horario, asistio) VALUES (?, ?, 0)',
      [id_usuario, id_horario]
    );

    await db.query(
      'UPDATE horarios_clase SET cupo_libre = cupo_libre - 1 WHERE id_horario = ?',
      [id_horario]
    );

    return res.status(201).json({ mensaje: 'Turno reservado exitosamente' });

  } catch (error) {
    console.error('Error al reservar turno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al reservar turno' });
  }
};

// 2. Asignar turno manualmente a un alumno (Admin y Profesor)
const asignarTurnoManual = async (req, res) => {
  try {
    const { id_usuario, id_horario } = req.body;

    if (!id_usuario || !id_horario) {
      return res.status(400).json({ mensaje: 'id_usuario e id_horario son requeridos' });
    }

    const [horarios] = await db.query('SELECT cupo_libre FROM horarios_clase WHERE id_horario = ?', [id_horario]);
    if (horarios.length === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    await db.query(
      'INSERT INTO turnos (id_usuario, id_horario, asistio) VALUES (?, ?, 0)',
      [id_usuario, id_horario]
    );

    await db.query(
      'UPDATE horarios_clase SET cupo_libre = GREATEST(0, cupo_libre - 1) WHERE id_horario = ?',
      [id_horario]
    );

    return res.status(201).json({ mensaje: 'Turno asignado al alumno exitosamente' });
  } catch (error) {
    console.error('Error al asignar turno manual:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 3. Cancelar / Eliminar turno
const cancelarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario, id_rol } = req.usuario;

    // Buscar el turno
    const [turnos] = await db.query('SELECT id_turno, id_usuario, id_horario FROM turnos WHERE id_turno = ?', [id]);
    if (turnos.length === 0) {
      return res.status(404).json({ mensaje: 'Turno no encontrado' });
    }

    const turno = turnos[0];

    // Si es alumno, solo puede cancelar su propio turno
    if (id_rol === 3 && turno.id_usuario !== id_usuario) {
      return res.status(403).json({ mensaje: 'No podés cancelar el turno de otra persona' });
    }

    await db.query('DELETE FROM turnos WHERE id_turno = ?', [id]);

    // Devolver el cupo
    await db.query(
      'UPDATE horarios_clase SET cupo_libre = cupo_libre + 1 WHERE id_horario = ?',
      [turno.id_horario]
    );

    return res.json({ mensaje: 'Turno cancelado y cupo restaurado' });
  } catch (error) {
    console.error('Error al cancelar turno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 4. Listar turnos (Alumnos ven los suyos, Admin/Profesor ven todos)
const listarTurnos = async (req, res) => {
  try {
    const { id_usuario, id_rol } = req.usuario;

    let query = `
      SELECT 
        t.id_turno, t.asistio,
        u.id_usuario, u.nombre, u.apellido, u.dni,
        c.descripcion AS clase, c.nombre_profesor,
        h.dia_semana, h.hora_inicio, h.hora_fin
      FROM turnos t
      INNER JOIN usuarios u ON t.id_usuario = u.id_usuario
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      INNER JOIN clases c ON h.id_clase = c.id_clase
    `;

    const params = [];

    if (id_rol === 3) {
      query += ' WHERE t.id_usuario = ?';
      params.push(id_usuario);
    }

    query += ' ORDER BY h.hora_inicio ASC';

    const [turnos] = await db.query(query, params);
    return res.json(turnos);
  } catch (error) {
    console.error('Error al listar turnos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 5. Marcar asistencia manual (Admin y Profesor)
const actualizarAsistencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { asistio } = req.body; // 1 o 0

    const [resultado] = await db.query(
      'UPDATE turnos SET asistio = ? WHERE id_turno = ?',
      [asistio, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Turno no encontrado' });
    }

    // NUEVO: si se marca presente, sumamos un registro en "asistencias" con la fecha
    // de hoy. Es lo que permite calcular "turnos restantes" del mes sin romper nada
    // de lo que ya tenías (turnos.asistio sigue funcionando igual que antes).
    if (Number(asistio) === 1) {
      const [turnos] = await db.query('SELECT id_usuario, id_horario FROM turnos WHERE id_turno = ?', [id]);
      if (turnos.length > 0) {
        await db.query(
          'INSERT INTO asistencias (id_usuario, id_horario, fecha, hora) VALUES (?, ?, CURDATE(), CURTIME())',
          [turnos[0].id_usuario, turnos[0].id_horario]
        );
      }
    }

    return res.json({ mensaje: 'Asistencia actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar asistencia:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 6. VALIDACIÓN DEL MOLINETE ELECTRÓNICO (Acceso por DNI)
const validarAccesoMolinete = async (req, res) => {
  try {
    const { dni } = req.body;

    if (!dni) {
      return res.status(400).json({ acceso: false, mensaje: 'Ingrese su DNI' });
    }

    // A. Buscar al usuario
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, apellido, id_rol FROM usuarios WHERE dni = ?',
      [dni]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ acceso: false, mensaje: 'DNI no registrado en el sistema' });
    }

    const usuario = usuarios[0];

    // B. Si es Administrador (1) o Profesor (2), apertura directa
    if (usuario.id_rol === 1 || usuario.id_rol === 2) {
      return res.json({
        acceso: true,
        mensaje: `¡Bienvenid@ ${usuario.nombre}!`
      });
    }

    // C. Si es Alumno (3), validar turno en el día y horario actual con tolerancia ±10 min
    const diaActual = obtenerDiaSemanaEspanol();

    const [turnosValidos] = await db.query(`
      SELECT t.id_turno, t.id_horario, h.hora_inicio, h.hora_fin
      FROM turnos t
      INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
      WHERE t.id_usuario = ?
        AND h.dia_semana = ?
        AND CURTIME() BETWEEN SUBTIME(h.hora_inicio, '00:10:00') AND ADDTIME(h.hora_inicio, '00:10:00')
      LIMIT 1
    `, [usuario.id_usuario, diaActual]);

    if (turnosValidos.length === 0) {
      return res.status(403).json({
        acceso: false,
        mensaje: `Acceso denegado: No tenés un turno asignado para el día de hoy (${diaActual}) en este horario`
      });
    }

    const turno = turnosValidos[0];

    // D. Registrar la asistencia del turno (sin alterar puntos automáticamente)
    await db.query('UPDATE turnos SET asistio = 1 WHERE id_turno = ?', [turno.id_turno]);

    // NUEVO: una fila más en "asistencias", con la fecha de HOY. Esto es lo que
    // hace que "turnos restantes" baje solo cada vez que alguien entra por el molinete.
    await db.query(
      'INSERT INTO asistencias (id_usuario, id_horario, fecha, hora) VALUES (?, ?, CURDATE(), CURTIME())',
      [usuario.id_usuario, turno.id_horario]
    );

    return res.json({
      acceso: true,
      mensaje: `¡Buen entrenamiento, ${usuario.nombre}!`
    });

  } catch (error) {
    console.error('Error en acceso por molinete:', error);
    return res.status(500).json({ acceso: false, mensaje: 'Error interno del servidor al procesar el acceso' });
  }
};

module.exports = {
  reservarTurno,
  asignarTurnoManual,
  cancelarTurno,
  listarTurnos,
  actualizarAsistencia,
  validarAccesoMolinete
};