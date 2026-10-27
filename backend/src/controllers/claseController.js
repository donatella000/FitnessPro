const db = require('../config/db');
const { validarImagen } = require('../servicios/imagenes');

const ROL_ADMIN = 1;
const ROL_PROFESOR = 2;

const NOMBRES_DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const REGEX_HORA = /^\d{2}:\d{2}(:\d{2})?$/;

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

// Convierte 'HH:MM' o 'HH:MM:SS' a minutos desde las 00:00
const aMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

// Convierte minutos a 'HH:MM:00'
const aHora = (minutos) => {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}:00`;
};

const buscarClase = async (id_clase) => {
  const [filas] = await db.query(`
    SELECT c.id_clase, c.id_profesor, c.activo, a.tipo
    FROM clases c
    INNER JOIN actividades a ON c.id_actividad = a.id_actividad
    WHERE c.id_clase = ?
  `, [id_clase]);
  return filas[0] || null;
};

// El admin gestiona cualquier clase; el profesor solo las suyas
const puedeGestionarClase = (usuario, clase) => {
  if (usuario.id_rol === ROL_ADMIN) return true;
  return usuario.id_rol === ROL_PROFESOR && clase.id_profesor === usuario.id_usuario;
};

// Verifica que el horario no se superponga con otro de la misma clase
// ni con otro horario del mismo profesor (no puede dar dos clases a la vez)
const haySuperposicion = async ({ id_clase, id_profesor, dia_semana, hora_inicio, hora_fin, excluirId = 0 }) => {
  const [filas] = await db.query(`
    SELECT h.id_horario
    FROM horarios_clase h
    INNER JOIN clases c ON h.id_clase = c.id_clase
    WHERE h.activo = 1 AND c.activo = 1
      AND h.dia_semana = ?
      AND h.hora_inicio < ? AND h.hora_fin > ?
      AND h.id_horario <> ?
      AND (h.id_clase = ? OR c.id_profesor = ?)
    LIMIT 1
  `, [dia_semana, hora_fin, hora_inicio, excluirId, id_clase, id_profesor]);
  return filas.length > 0;
};

// Cuenta turnos reservados desde hoy en adelante, según un filtro
const contarTurnosFuturos = async (filtroSql, valores) => {
  const [filas] = await db.query(`
    SELECT COUNT(*) AS cantidad
    FROM turnos t
    INNER JOIN horarios_clase h ON t.id_horario = h.id_horario
    INNER JOIN clases c ON h.id_clase = c.id_clase
    WHERE t.estado = 'reservado' AND t.fecha >= CURDATE() AND ${filtroSql}
  `, valores);
  return filas[0].cantidad;
};

const validarHorario = ({ dia_semana, hora_inicio, hora_fin, cupo_maximo }) => {
  if (!dia_semana || !hora_inicio || !hora_fin || !cupo_maximo) {
    return 'Los campos día, hora de inicio, hora de fin y cupo máximo son obligatorios.';
  }
  if (Number(dia_semana) < 1 || Number(dia_semana) > 7) {
    return 'El día debe ser un número de 1 (lunes) a 7 (domingo).';
  }
  if (!REGEX_HORA.test(hora_inicio) || !REGEX_HORA.test(hora_fin)) {
    return 'Las horas deben tener el formato HH:MM.';
  }
  if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
    return 'La hora de fin debe ser posterior a la hora de inicio.';
  }
  if (Number(cupo_maximo) < 1) {
    return 'El cupo máximo debe ser mayor a cero.';
  }
  return null;
};

// ==========================================================
// ACTIVIDADES (solo Admin crea, modifica y da de baja)
// ==========================================================

// Listar actividades. ?incluirInactivas=1 las muestra todas (solo admin)
const obtenerActividades = async (req, res) => {
  try {
    const verTodas = req.query.incluirInactivas && req.usuario.id_rol === ROL_ADMIN;
    const [actividades] = await db.query(`
      SELECT id_actividad, nombre, descripcion, tipo, icono, activo
      FROM actividades
      ${verTodas ? '' : 'WHERE activo = 1'}
      ORDER BY nombre ASC
    `);
    return res.json(actividades);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener actividades.' });
  }
};

// Crear actividad. Si es de tipo musculación, se crea automáticamente
// su clase (sin profesor), a la que después se le cargan los horarios.
const crearActividad = async (req, res) => {
  const { nombre, descripcion, tipo, icono } = req.body;
  const conexion = await db.getConnection();

  try {
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ mensaje: 'El nombre de la actividad es obligatorio.' });
    }

    const tipoFinal = tipo === 'musculacion' ? 'musculacion' : 'clase';

    if (icono) {
      const errorIcono = validarImagen(icono, 400);
      if (errorIcono) return res.status(400).json({ mensaje: errorIcono });
    }

    const [existente] = await conexion.query(
      'SELECT id_actividad FROM actividades WHERE nombre = ?',
      [nombre.trim()]
    );
    if (existente.length > 0) {
      return res.status(400).json({ mensaje: 'Ya existe una actividad con ese nombre.' });
    }

    await conexion.beginTransaction();

    const [resultado] = await conexion.query(
      'INSERT INTO actividades (nombre, descripcion, tipo, icono) VALUES (?, ?, ?, ?)',
      [nombre.trim(), descripcion || null, tipoFinal, icono || null]
    );

    let id_clase = null;
    if (tipoFinal === 'musculacion') {
      const [clase] = await conexion.query(
        'INSERT INTO clases (id_actividad, id_profesor) VALUES (?, NULL)',
        [resultado.insertId]
      );
      id_clase = clase.insertId;
    }

    await conexion.commit();

    return res.status(201).json({
      mensaje: 'Actividad creada exitosamente.',
      id_actividad: resultado.insertId,
      id_clase // solo para musculación: la clase a la que se le cargan los horarios
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al crear actividad:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la actividad.' });
  } finally {
    conexion.release();
  }
};

// Modificar nombre o descripción. El tipo no se cambia una vez creada.
const actualizarActividad = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo, icono } = req.body;

    // icono: una imagen nueva, o null para volver al ícono incluido en la página
    if (icono) {
      const errorIcono = validarImagen(icono, 400);
      if (errorIcono) return res.status(400).json({ mensaje: errorIcono });
    }
    if (icono !== undefined) {
      const [cambio] = await db.query('UPDATE actividades SET icono = ? WHERE id_actividad = ?', [icono || null, id]);
      // Si solo se cambió el ícono, no hace falta seguir
      if (nombre === undefined && descripcion === undefined && activo === undefined) {
        return cambio.affectedRows
          ? res.json({ mensaje: icono ? 'Ícono actualizado.' : 'Se volvió al ícono original.' })
          : res.status(404).json({ mensaje: 'Actividad no encontrada.' });
      }
    }

    if (nombre !== undefined && !nombre.trim()) {
      return res.status(400).json({ mensaje: 'El nombre no puede quedar vacío.' });
    }

    if (nombre) {
      const [duplicado] = await db.query(
        'SELECT id_actividad FROM actividades WHERE nombre = ? AND id_actividad <> ?',
        [nombre.trim(), id]
      );
      if (duplicado.length > 0) {
        return res.status(400).json({ mensaje: 'Ya existe otra actividad con ese nombre.' });
      }
    }

    const [resultado] = await db.query(`
      UPDATE actividades SET
        nombre = COALESCE(?, nombre),
        descripcion = COALESCE(?, descripcion),
        activo = COALESCE(?, activo)
      WHERE id_actividad = ?
    `, [nombre ? nombre.trim() : null, descripcion ?? null, activo ?? null, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Actividad no encontrada.' });
    }

    return res.json({ mensaje: 'Actividad actualizada exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la actividad.' });
  }
};

// Baja lógica de la actividad junto con sus clases, horarios y suscripciones.
// No se permite si hay turnos reservados a futuro.
const eliminarActividad = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();

  try {
    const pendientes = await contarTurnosFuturos('c.id_actividad = ?', [id]);
    if (pendientes > 0) {
      return res.status(400).json({
        mensaje: `No se puede dar de baja: hay ${pendientes} turno(s) reservado(s) a futuro en esta actividad.`
      });
    }

    await conexion.beginTransaction();

    const [resultado] = await conexion.query(
      'UPDATE actividades SET activo = 0 WHERE id_actividad = ?',
      [id]
    );
    if (resultado.affectedRows === 0) {
      await conexion.rollback();
      return res.status(404).json({ mensaje: 'Actividad no encontrada.' });
    }

    await conexion.query(`
      UPDATE horarios_clase h
      INNER JOIN clases c ON h.id_clase = c.id_clase
      SET h.activo = 0
      WHERE c.id_actividad = ?
    `, [id]);
    await conexion.query('UPDATE clases SET activo = 0 WHERE id_actividad = ?', [id]);
    await conexion.query('UPDATE suscripciones SET activo = 0 WHERE id_actividad = ?', [id]);

    await conexion.commit();
    return res.json({ mensaje: 'Actividad dada de baja junto con sus clases, horarios y suscripciones.' });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al eliminar actividad:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja la actividad.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// CLASES (actividad + profesor) CON SUS HORARIOS
// ==========================================================

// Listar clases con sus horarios.
// Filtros opcionales: ?id_actividad=2  ?id_profesor=5  ?mias=1 (las del profesor logueado)
const obtenerClases = async (req, res) => {
  try {
    const { id_actividad, id_profesor, mias } = req.query;
    const condiciones = ['c.activo = 1', 'a.activo = 1'];
    const valores = [];

    if (id_actividad) {
      condiciones.push('c.id_actividad = ?');
      valores.push(id_actividad);
    }
    if (mias) {
      condiciones.push('c.id_profesor = ?');
      valores.push(req.usuario.id_usuario);
    } else if (id_profesor) {
      condiciones.push('c.id_profesor = ?');
      valores.push(id_profesor);
    }

    const [filas] = await db.query(`
      SELECT
        c.id_clase, c.id_actividad, a.nombre AS actividad, a.tipo,
        c.id_profesor, CONCAT(u.nombre, ' ', u.apellido) AS profesor,
        h.id_horario, h.dia_semana, h.hora_inicio, h.hora_fin, h.cupo_maximo
      FROM clases c
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      LEFT JOIN usuarios u ON c.id_profesor = u.id_usuario
      LEFT JOIN horarios_clase h ON h.id_clase = c.id_clase AND h.activo = 1
      WHERE ${condiciones.join(' AND ')}
      ORDER BY a.nombre, profesor, h.dia_semana, h.hora_inicio
    `, valores);

    // Agrupar: una entrada por clase, con su lista de horarios
    const clases = [];
    const porId = new Map();

    for (const fila of filas) {
      if (!porId.has(fila.id_clase)) {
        const clase = {
          id_clase: fila.id_clase,
          id_actividad: fila.id_actividad,
          actividad: fila.actividad,
          tipo: fila.tipo,
          id_profesor: fila.id_profesor,
          profesor: fila.profesor,
          horarios: []
        };
        porId.set(fila.id_clase, clase);
        clases.push(clase);
      }
      if (fila.id_horario) {
        porId.get(fila.id_clase).horarios.push({
          id_horario: fila.id_horario,
          dia_semana: fila.dia_semana,
          dia_nombre: NOMBRES_DIAS[fila.dia_semana],
          hora_inicio: fila.hora_inicio,
          hora_fin: fila.hora_fin,
          cupo_maximo: fila.cupo_maximo
        });
      }
    }

    return res.json(clases);
  } catch (error) {
    console.error('Error al obtener clases:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener clases.' });
  }
};

// Crear clase. El admin elige el profesor; el profesor se la asigna a sí mismo.
const crearClase = async (req, res) => {
  try {
    const { id_actividad } = req.body;
    let { id_profesor } = req.body;

    if (!id_actividad) {
      return res.status(400).json({ mensaje: 'Debe indicar la actividad.' });
    }

    const [actividad] = await db.query(
      'SELECT tipo FROM actividades WHERE id_actividad = ? AND activo = 1',
      [id_actividad]
    );
    if (actividad.length === 0) {
      return res.status(404).json({ mensaje: 'La actividad no existe o está dada de baja.' });
    }
    if (actividad[0].tipo === 'musculacion') {
      return res.status(400).json({
        mensaje: 'Musculación ya tiene su clase creada automáticamente. Cargale los horarios directamente.'
      });
    }

    if (req.usuario.id_rol === ROL_PROFESOR) {
      id_profesor = req.usuario.id_usuario;
    }

    if (!id_profesor) {
      return res.status(400).json({ mensaje: 'Debe indicar el profesor que dicta la clase.' });
    }

    const [profesor] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = ? AND activo = 1',
      [id_profesor, ROL_PROFESOR]
    );
    if (profesor.length === 0) {
      return res.status(400).json({ mensaje: 'El usuario indicado no es un profesor activo.' });
    }

    const [existente] = await db.query(
      'SELECT id_clase FROM clases WHERE id_actividad = ? AND id_profesor = ? AND activo = 1',
      [id_actividad, id_profesor]
    );
    if (existente.length > 0) {
      return res.status(400).json({
        mensaje: 'Ese profesor ya tiene una clase de esta actividad. Agregale horarios a la existente.',
        id_clase: existente[0].id_clase
      });
    }

    const [resultado] = await db.query(
      'INSERT INTO clases (id_actividad, id_profesor) VALUES (?, ?)',
      [id_actividad, id_profesor]
    );

    return res.status(201).json({ mensaje: 'Clase creada exitosamente.', id_clase: resultado.insertId });
  } catch (error) {
    console.error('Error al crear clase:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la clase.' });
  }
};

// Cambiar el profesor de una clase (solo admin)
const actualizarClase = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_profesor } = req.body;

    if (req.usuario.id_rol !== ROL_ADMIN) {
      return res.status(403).json({ mensaje: 'Solo el administrador puede reasignar el profesor de una clase.' });
    }

    const clase = await buscarClase(id);
    if (!clase) {
      return res.status(404).json({ mensaje: 'Clase no encontrada.' });
    }
    if (clase.tipo === 'musculacion') {
      return res.status(400).json({ mensaje: 'La clase de musculación no tiene profesor asignado.' });
    }

    const [profesor] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = ? AND activo = 1',
      [id_profesor, ROL_PROFESOR]
    );
    if (profesor.length === 0) {
      return res.status(400).json({ mensaje: 'El usuario indicado no es un profesor activo.' });
    }

    await db.query('UPDATE clases SET id_profesor = ? WHERE id_clase = ?', [id_profesor, id]);
    return res.json({ mensaje: 'Profesor reasignado exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar clase:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la clase.' });
  }
};

// Baja lógica de la clase y sus horarios. No se permite con turnos a futuro.
const eliminarClase = async (req, res) => {
  const { id } = req.params;

  try {
    const clase = await buscarClase(id);
    if (!clase) {
      return res.status(404).json({ mensaje: 'Clase no encontrada.' });
    }
    if (!puedeGestionarClase(req.usuario, clase)) {
      return res.status(403).json({ mensaje: 'Solo podés dar de baja tus propias clases.' });
    }
    if (clase.tipo === 'musculacion') {
      return res.status(400).json({ mensaje: 'Para quitar musculación, da de baja la actividad completa.' });
    }

    const pendientes = await contarTurnosFuturos('c.id_clase = ?', [id]);
    if (pendientes > 0) {
      return res.status(400).json({
        mensaje: `No se puede dar de baja: hay ${pendientes} turno(s) reservado(s) a futuro en esta clase.`
      });
    }

    await db.query('UPDATE horarios_clase SET activo = 0 WHERE id_clase = ?', [id]);
    await db.query('UPDATE clases SET activo = 0 WHERE id_clase = ?', [id]);

    return res.json({ mensaje: 'Clase dada de baja exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar clase:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja la clase.' });
  }
};

// ==========================================================
// HORARIOS
// ==========================================================

// Agregar un horario a una clase
const agregarHorario = async (req, res) => {
  try {
    const { id_clase, dia_semana, hora_inicio, hora_fin, cupo_maximo } = req.body;

    const errorValidacion = validarHorario(req.body);
    if (!id_clase || errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion || 'Debe indicar la clase.' });
    }

    const clase = await buscarClase(id_clase);
    if (!clase || !clase.activo) {
      return res.status(404).json({ mensaje: 'La clase no existe o está dada de baja.' });
    }
    if (!puedeGestionarClase(req.usuario, clase)) {
      return res.status(403).json({ mensaje: 'Solo podés cargar horarios en tus propias clases.' });
    }

    if (await haySuperposicion({ id_clase, id_profesor: clase.id_profesor, dia_semana, hora_inicio, hora_fin })) {
      return res.status(400).json({
        mensaje: 'El horario se superpone con otro de la misma clase o del mismo profesor.'
      });
    }

    const [resultado] = await db.query(`
      INSERT INTO horarios_clase (id_clase, dia_semana, hora_inicio, hora_fin, cupo_maximo)
      VALUES (?, ?, ?, ?, ?)
    `, [id_clase, dia_semana, hora_inicio, hora_fin, cupo_maximo]);

    return res.status(201).json({ mensaje: 'Horario agregado exitosamente.', id_horario: resultado.insertId });
  } catch (error) {
    console.error('Error al agregar horario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al agregar el horario.' });
  }
};

// Generar varios horarios de una vez (pensado para musculación).
// Ejemplo de body:
// { "id_clase": 1, "dias": [1,2,3,4,5], "hora_desde": "08:00",
//   "hora_hasta": "22:00", "duracion_minutos": 60, "cupo_maximo": 20 }
// Los horarios que se superpongan con uno existente se saltean.
const generarHorarios = async (req, res) => {
  try {
    const { id_clase, dias, hora_desde, hora_hasta, duracion_minutos, cupo_maximo } = req.body;

    if (!id_clase || !Array.isArray(dias) || dias.length === 0 || !hora_desde || !hora_hasta
        || !duracion_minutos || !cupo_maximo) {
      return res.status(400).json({
        mensaje: 'Faltan datos: id_clase, dias, hora_desde, hora_hasta, duracion_minutos y cupo_maximo.'
      });
    }
    if (!REGEX_HORA.test(hora_desde) || !REGEX_HORA.test(hora_hasta)) {
      return res.status(400).json({ mensaje: 'Las horas deben tener el formato HH:MM.' });
    }
    if (dias.some((d) => Number(d) < 1 || Number(d) > 7)) {
      return res.status(400).json({ mensaje: 'Los días deben ser números de 1 (lunes) a 7 (domingo).' });
    }

    const inicio = aMinutos(hora_desde);
    const fin = aMinutos(hora_hasta);
    const duracion = Number(duracion_minutos);

    if (fin <= inicio || duracion < 15) {
      return res.status(400).json({ mensaje: 'Rango horario inválido o duración menor a 15 minutos.' });
    }

    const clase = await buscarClase(id_clase);
    if (!clase || !clase.activo) {
      return res.status(404).json({ mensaje: 'La clase no existe o está dada de baja.' });
    }
    if (!puedeGestionarClase(req.usuario, clase)) {
      return res.status(403).json({ mensaje: 'Solo podés cargar horarios en tus propias clases.' });
    }

    let creados = 0;
    let salteados = 0;

    for (const dia of dias) {
      for (let desde = inicio; desde + duracion <= fin; desde += duracion) {
        const hora_inicio = aHora(desde);
        const hora_fin = aHora(desde + duracion);

        const superpuesto = await haySuperposicion({
          id_clase, id_profesor: clase.id_profesor, dia_semana: dia, hora_inicio, hora_fin
        });

        if (superpuesto) {
          salteados++;
          continue;
        }

        await db.query(`
          INSERT INTO horarios_clase (id_clase, dia_semana, hora_inicio, hora_fin, cupo_maximo)
          VALUES (?, ?, ?, ?, ?)
        `, [id_clase, dia, hora_inicio, hora_fin, cupo_maximo]);
        creados++;
      }
    }

    return res.status(201).json({
      mensaje: `Se crearon ${creados} horario(s).${salteados ? ` Se saltearon ${salteados} por superponerse con horarios existentes.` : ''}`,
      creados,
      salteados
    });
  } catch (error) {
    console.error('Error al generar horarios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al generar los horarios.' });
  }
};

// Modificar un horario (día, horas o cupo)
const actualizarHorario = async (req, res) => {
  try {
    const { id } = req.params;

    const [filas] = await db.query('SELECT * FROM horarios_clase WHERE id_horario = ? AND activo = 1', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado.' });
    }
    const actual = filas[0];

    const clase = await buscarClase(actual.id_clase);
    if (!puedeGestionarClase(req.usuario, clase)) {
      return res.status(403).json({ mensaje: 'Solo podés modificar horarios de tus propias clases.' });
    }

    // Combinar los datos actuales con los que llegan
    const nuevo = {
      dia_semana: req.body.dia_semana ?? actual.dia_semana,
      hora_inicio: req.body.hora_inicio ?? actual.hora_inicio,
      hora_fin: req.body.hora_fin ?? actual.hora_fin,
      cupo_maximo: req.body.cupo_maximo ?? actual.cupo_maximo
    };

    const errorValidacion = validarHorario(nuevo);
    if (errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion });
    }

    if (await haySuperposicion({
      id_clase: actual.id_clase, id_profesor: clase.id_profesor, ...nuevo, excluirId: actual.id_horario
    })) {
      return res.status(400).json({
        mensaje: 'El horario se superpone con otro de la misma clase o del mismo profesor.'
      });
    }

    // Si cambia el día o la hora y hay alumnos anotados a futuro, no se permite
    const cambiaMomento = Number(nuevo.dia_semana) !== actual.dia_semana
      || aMinutos(nuevo.hora_inicio) !== aMinutos(actual.hora_inicio)
      || aMinutos(nuevo.hora_fin) !== aMinutos(actual.hora_fin);

    if (cambiaMomento) {
      const pendientes = await contarTurnosFuturos('h.id_horario = ?', [id]);
      if (pendientes > 0) {
        return res.status(400).json({
          mensaje: `No se puede cambiar el día u horario: hay ${pendientes} alumno(s) anotado(s) a futuro. Sí se puede modificar el cupo.`
        });
      }
    }

    await db.query(`
      UPDATE horarios_clase
      SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, cupo_maximo = ?
      WHERE id_horario = ?
    `, [nuevo.dia_semana, nuevo.hora_inicio, nuevo.hora_fin, nuevo.cupo_maximo, id]);

    return res.json({ mensaje: 'Horario actualizado exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el horario.' });
  }
};

// Baja lógica de un horario. No se permite con alumnos anotados a futuro.
const eliminarHorario = async (req, res) => {
  try {
    const { id } = req.params;

    const [filas] = await db.query('SELECT id_clase FROM horarios_clase WHERE id_horario = ? AND activo = 1', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado.' });
    }

    const clase = await buscarClase(filas[0].id_clase);
    if (!puedeGestionarClase(req.usuario, clase)) {
      return res.status(403).json({ mensaje: 'Solo podés eliminar horarios de tus propias clases.' });
    }

    const pendientes = await contarTurnosFuturos('h.id_horario = ?', [id]);
    if (pendientes > 0) {
      return res.status(400).json({
        mensaje: `No se puede eliminar: hay ${pendientes} alumno(s) anotado(s) a futuro en este horario.`
      });
    }

    await db.query('UPDATE horarios_clase SET activo = 0 WHERE id_horario = ?', [id]);
    return res.json({ mensaje: 'Horario eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el horario.' });
  }
};

// ==========================================================
// PROFESORES DE SALA (musculación) - solo Admin
// ==========================================================
// Son los turnos de trabajo de los profesores en la sala. Se muestran
// en la portada; el alumno no elige profesor al reservar musculación.

// Listar los turnos de sala. Filtro opcional: ?id_actividad=1
const obtenerProfesoresSala = async (req, res) => {
  try {
    const condiciones = ['u.activo = 1', 'a.activo = 1'];
    const valores = [];
    if (req.query.id_actividad) {
      condiciones.push('ps.id_actividad = ?');
      valores.push(req.query.id_actividad);
    }

    const [filas] = await db.query(`
      SELECT ps.id_profesor_sala, ps.id_actividad, a.nombre AS actividad,
             ps.id_profesor, CONCAT(u.nombre, ' ', u.apellido) AS profesor,
             ps.dia_semana, ps.hora_inicio, ps.hora_fin
      FROM profesores_sala ps
      INNER JOIN usuarios u ON ps.id_profesor = u.id_usuario
      INNER JOIN actividades a ON ps.id_actividad = a.id_actividad
      WHERE ${condiciones.join(' AND ')}
      ORDER BY profesor, ps.dia_semana, ps.hora_inicio
    `, valores);

    return res.json(filas.map((f) => ({ ...f, dia_nombre: NOMBRES_DIAS[f.dia_semana] })));
  } catch (error) {
    console.error('Error al obtener profesores de sala:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener los profesores de sala.' });
  }
};

// Asignar un profesor a la sala en uno o varios días con la misma franja.
// Body: { id_actividad, id_profesor, dias: [1,2,3,4,5], hora_inicio: '08:00', hora_fin: '15:00' }
const agregarProfesorSala = async (req, res) => {
  try {
    const { id_actividad, id_profesor, dias, hora_inicio, hora_fin } = req.body;

    if (!id_actividad || !id_profesor || !Array.isArray(dias) || dias.length === 0 || !hora_inicio || !hora_fin) {
      return res.status(400).json({ mensaje: 'Faltan datos: actividad, profesor, días y franja horaria.' });
    }
    if (!REGEX_HORA.test(hora_inicio) || !REGEX_HORA.test(hora_fin) || aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
      return res.status(400).json({ mensaje: 'La franja horaria no es válida.' });
    }
    if (dias.some((d) => Number(d) < 1 || Number(d) > 7)) {
      return res.status(400).json({ mensaje: 'Los días deben ser números de 1 (lunes) a 7 (domingo).' });
    }

    const [actividad] = await db.query(
      "SELECT id_actividad FROM actividades WHERE id_actividad = ? AND tipo = 'musculacion' AND activo = 1",
      [id_actividad]
    );
    if (actividad.length === 0) {
      return res.status(400).json({ mensaje: 'Los profesores de sala solo se asignan a actividades de turnos libres.' });
    }

    const [profesor] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = ? AND activo = 1',
      [id_profesor, ROL_PROFESOR]
    );
    if (profesor.length === 0) {
      return res.status(400).json({ mensaje: 'El usuario indicado no es un profesor activo.' });
    }

    const diasConflicto = [];
    for (const dia of dias) {
      // Superposición con otro turno de sala del mismo profesor
      const [enSala] = await db.query(`
        SELECT 1 FROM profesores_sala
        WHERE id_profesor = ? AND dia_semana = ? AND hora_inicio < ? AND hora_fin > ?
        LIMIT 1
      `, [id_profesor, dia, hora_fin, hora_inicio]);

      // Superposición con una clase que dicta ese profesor
      const [enClase] = await db.query(`
        SELECT 1 FROM horarios_clase h
        INNER JOIN clases c ON h.id_clase = c.id_clase
        WHERE c.id_profesor = ? AND c.activo = 1 AND h.activo = 1
          AND h.dia_semana = ? AND h.hora_inicio < ? AND h.hora_fin > ?
        LIMIT 1
      `, [id_profesor, dia, hora_fin, hora_inicio]);

      if (enSala.length || enClase.length) diasConflicto.push(NOMBRES_DIAS[dia]);
    }

    if (diasConflicto.length > 0) {
      return res.status(400).json({
        mensaje: `El profesor ya tiene un turno o una clase en esa franja: ${diasConflicto.join(', ')}.`
      });
    }

    for (const dia of dias) {
      await db.query(`
        INSERT INTO profesores_sala (id_actividad, id_profesor, dia_semana, hora_inicio, hora_fin)
        VALUES (?, ?, ?, ?, ?)
      `, [id_actividad, id_profesor, dia, hora_inicio, hora_fin]);
    }

    return res.status(201).json({ mensaje: `Profesor asignado a la sala en ${dias.length} día(s).` });
  } catch (error) {
    console.error('Error al asignar profesor de sala:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al asignar el profesor de sala.' });
  }
};

// Quitar un turno de sala
const eliminarProfesorSala = async (req, res) => {
  try {
    const [resultado] = await db.query('DELETE FROM profesores_sala WHERE id_profesor_sala = ?', [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Turno de sala no encontrado.' });
    }
    return res.json({ mensaje: 'Turno de sala eliminado.' });
  } catch (error) {
    console.error('Error al eliminar profesor de sala:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el turno de sala.' });
  }
};

module.exports = {
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  obtenerClases,
  crearClase,
  actualizarClase,
  eliminarClase,
  agregarHorario,
  generarHorarios,
  actualizarHorario,
  eliminarHorario,
  obtenerProfesoresSala,
  agregarProfesorSala,
  eliminarProfesorSala
};
