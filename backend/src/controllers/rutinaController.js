const db = require('../config/db');

const ROL_ALUMNO = 3;
const DIAS_POR_RUTINA = 3;
const MAX_EJERCICIOS_POR_DIA = 8;

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

// Arma la rutina con sus 3 días y los ejercicios de cada día
const armarRutina = async (rutina) => {
  const [ejercicios] = await db.query(`
    SELECT re.id_rutina_ejercicio, re.dia, re.orden, re.id_ejercicio,
           e.nombre, e.grupo_muscular, re.series, re.repeticiones, re.peso_kg, re.observaciones
    FROM rutina_ejercicios re
    INNER JOIN ejercicios e ON re.id_ejercicio = e.id_ejercicio
    WHERE re.id_rutina = ?
    ORDER BY re.dia, re.orden
  `, [rutina.id_rutina]);

  const dias = [];
  for (let dia = 1; dia <= DIAS_POR_RUTINA; dia++) {
    dias.push({ dia, ejercicios: ejercicios.filter((e) => e.dia === dia) });
  }

  return { ...rutina, dias };
};

const buscarRutinaActiva = async (id_alumno) => {
  const [filas] = await db.query(`
    SELECT r.id_rutina, r.id_alumno, r.nombre, r.fecha_creacion,
           CONCAT(c.nombre, ' ', c.apellido) AS creada_por
    FROM rutinas r
    LEFT JOIN usuarios c ON r.id_creador = c.id_usuario
    WHERE r.id_alumno = ? AND r.activa = 1
    ORDER BY r.fecha_creacion DESC
    LIMIT 1
  `, [id_alumno]);
  return filas[0] || null;
};

// Valida el contenido de una rutina enviado desde el frontend.
// Formato esperado:
// dias: [ { dia: 1, ejercicios: [ { id_ejercicio, series, repeticiones, peso_kg, observaciones } ] }, ... ]
const validarDias = async (dias) => {
  if (!Array.isArray(dias) || dias.length === 0) {
    return 'La rutina debe tener al menos un día con ejercicios.';
  }

  const idsEjercicios = new Set();

  for (const d of dias) {
    if (!Number.isInteger(Number(d.dia)) || d.dia < 1 || d.dia > DIAS_POR_RUTINA) {
      return `Los días de la rutina van del 1 al ${DIAS_POR_RUTINA}.`;
    }
    if (!Array.isArray(d.ejercicios)) {
      return `El día ${d.dia} no tiene una lista de ejercicios válida.`;
    }
    if (d.ejercicios.length > MAX_EJERCICIOS_POR_DIA) {
      return `El día ${d.dia} supera el máximo de ${MAX_EJERCICIOS_POR_DIA} ejercicios.`;
    }
    for (const e of d.ejercicios) {
      if (!e.id_ejercicio || !(Number(e.series) > 0) || !(Number(e.repeticiones) > 0)) {
        return `En el día ${d.dia}, cada ejercicio necesita ejercicio, series y repeticiones mayores a cero.`;
      }
      if (e.peso_kg !== undefined && e.peso_kg !== null && e.peso_kg !== '' && Number(e.peso_kg) < 0) {
        return 'El peso no puede ser negativo.';
      }
      idsEjercicios.add(Number(e.id_ejercicio));
    }
  }

  const diasRepetidos = new Set(dias.map((d) => Number(d.dia))).size !== dias.length;
  if (diasRepetidos) {
    return 'Hay días repetidos en la rutina.';
  }

  if (idsEjercicios.size === 0) {
    return 'La rutina debe tener al menos un ejercicio.';
  }

  const [existentes] = await db.query(
    'SELECT id_ejercicio FROM ejercicios WHERE id_ejercicio IN (?) AND activo = 1',
    [[...idsEjercicios]]
  );
  if (existentes.length !== idsEjercicios.size) {
    return 'Alguno de los ejercicios elegidos no existe o fue dado de baja.';
  }

  return null;
};

// Inserta los ejercicios de la rutina. El orden lo da la posición en la lista.
const insertarEjercicios = async (conexion, id_rutina, dias) => {
  for (const d of dias) {
    for (let i = 0; i < d.ejercicios.length; i++) {
      const e = d.ejercicios[i];
      await conexion.query(`
        INSERT INTO rutina_ejercicios
          (id_rutina, dia, orden, id_ejercicio, series, repeticiones, peso_kg, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id_rutina, d.dia, i + 1, e.id_ejercicio, e.series, e.repeticiones,
        e.peso_kg === '' || e.peso_kg === undefined ? null : e.peso_kg,
        e.observaciones || null
      ]);
    }
  }
};

// ==========================================================
// 1. CATÁLOGO DE EJERCICIOS
// ==========================================================

// Listar ejercicios. Filtros: ?grupo_muscular=Piernas  ?incluirInactivos=1
const obtenerEjercicios = async (req, res) => {
  try {
    const condiciones = [];
    const valores = [];

    if (!req.query.incluirInactivos) condiciones.push('activo = 1');
    if (req.query.grupo_muscular) {
      condiciones.push('grupo_muscular = ?');
      valores.push(req.query.grupo_muscular);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const [ejercicios] = await db.query(`
      SELECT id_ejercicio, nombre, grupo_muscular, descripcion, activo
      FROM ejercicios ${where}
      ORDER BY grupo_muscular, nombre
    `, valores);

    return res.json(ejercicios);
  } catch (error) {
    console.error('Error al obtener ejercicios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener ejercicios.' });
  }
};

const crearEjercicio = async (req, res) => {
  try {
    const { nombre, grupo_muscular, descripcion } = req.body;

    if (!nombre || !nombre.trim() || !grupo_muscular || !grupo_muscular.trim()) {
      return res.status(400).json({ mensaje: 'El nombre y el grupo muscular son obligatorios.' });
    }

    const [existente] = await db.query('SELECT id_ejercicio FROM ejercicios WHERE nombre = ?', [nombre.trim()]);
    if (existente.length > 0) {
      return res.status(400).json({ mensaje: 'Ya existe un ejercicio con ese nombre.' });
    }

    const [resultado] = await db.query(
      'INSERT INTO ejercicios (nombre, grupo_muscular, descripcion) VALUES (?, ?, ?)',
      [nombre.trim(), grupo_muscular.trim(), descripcion || null]
    );

    return res.status(201).json({ mensaje: 'Ejercicio creado exitosamente.', id_ejercicio: resultado.insertId });
  } catch (error) {
    console.error('Error al crear ejercicio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el ejercicio.' });
  }
};

const actualizarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, grupo_muscular, descripcion, activo } = req.body;

    if ((nombre !== undefined && !String(nombre).trim()) || (grupo_muscular !== undefined && !String(grupo_muscular).trim())) {
      return res.status(400).json({ mensaje: 'El nombre y el grupo muscular no pueden quedar vacíos.' });
    }

    if (nombre) {
      const [duplicado] = await db.query(
        'SELECT id_ejercicio FROM ejercicios WHERE nombre = ? AND id_ejercicio <> ?',
        [nombre.trim(), id]
      );
      if (duplicado.length > 0) {
        return res.status(400).json({ mensaje: 'Ya existe otro ejercicio con ese nombre.' });
      }
    }

    const [resultado] = await db.query(`
      UPDATE ejercicios SET
        nombre = COALESCE(?, nombre),
        grupo_muscular = COALESCE(?, grupo_muscular),
        descripcion = COALESCE(?, descripcion),
        activo = COALESCE(?, activo)
      WHERE id_ejercicio = ?
    `, [nombre ? nombre.trim() : null, grupo_muscular ? grupo_muscular.trim() : null,
        descripcion ?? null, activo ?? null, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ejercicio no encontrado.' });
    }

    return res.json({ mensaje: 'Ejercicio actualizado exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar ejercicio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el ejercicio.' });
  }
};

// Baja lógica: deja de ofrecerse para rutinas nuevas, pero
// las rutinas que ya lo tienen lo siguen mostrando
const eliminarEjercicio = async (req, res) => {
  try {
    const [resultado] = await db.query('UPDATE ejercicios SET activo = 0 WHERE id_ejercicio = ?', [req.params.id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ejercicio no encontrado.' });
    }

    return res.json({ mensaje: 'Ejercicio dado de baja. Las rutinas que ya lo incluyen no se modifican.' });
  } catch (error) {
    console.error('Error al eliminar ejercicio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja el ejercicio.' });
  }
};

// ==========================================================
// 2. CONSULTAR RUTINAS
// ==========================================================

// Rutina activa del alumno logueado
const miRutina = async (req, res) => {
  try {
    const rutina = await buscarRutinaActiva(req.usuario.id_usuario);
    if (!rutina) {
      return res.json(null);
    }
    return res.json(await armarRutina(rutina));
  } catch (error) {
    console.error('Error al obtener mi rutina:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la rutina.' });
  }
};

// Rutina activa de un alumno (Admin y Profesor)
const obtenerRutinaDeAlumno = async (req, res) => {
  try {
    const rutina = await buscarRutinaActiva(req.params.id_alumno);
    if (!rutina) {
      return res.json(null);
    }
    return res.json(await armarRutina(rutina));
  } catch (error) {
    console.error('Error al obtener rutina del alumno:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la rutina.' });
  }
};

// ==========================================================
// 3. CREAR RUTINA (Admin y Profesor)
// ==========================================================
// Body: { id_alumno, nombre?, dias: [...] }
// Si el alumno ya tenía una rutina activa, queda archivada y la nueva pasa a ser la activa.
const crearRutina = async (req, res) => {
  const { id_alumno, nombre, dias } = req.body;
  const conexion = await db.getConnection();

  try {
    if (!id_alumno) {
      return res.status(400).json({ mensaje: 'Debe indicar el alumno.' });
    }

    const [alumno] = await conexion.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_rol = ? AND activo = 1',
      [id_alumno, ROL_ALUMNO]
    );
    if (alumno.length === 0) {
      return res.status(404).json({ mensaje: 'El alumno no existe o está dado de baja.' });
    }

    const errorValidacion = await validarDias(dias);
    if (errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion });
    }

    await conexion.beginTransaction();

    await conexion.query('UPDATE rutinas SET activa = 0 WHERE id_alumno = ? AND activa = 1', [id_alumno]);

    const [resultado] = await conexion.query(
      'INSERT INTO rutinas (id_alumno, id_creador, nombre) VALUES (?, ?, ?)',
      [id_alumno, req.usuario.id_usuario, nombre || null]
    );

    await insertarEjercicios(conexion, resultado.insertId, dias);
    await conexion.commit();

    return res.status(201).json({ mensaje: 'Rutina creada exitosamente.', id_rutina: resultado.insertId });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al crear rutina:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la rutina.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 4. MODIFICAR RUTINA (Admin y Profesor)
// ==========================================================
// Body: { nombre?, dias: [...] }  -> reemplaza todos los ejercicios de la rutina
const actualizarRutina = async (req, res) => {
  const { id } = req.params;
  const { nombre, dias } = req.body;
  const conexion = await db.getConnection();

  try {
    const [rutinas] = await conexion.query('SELECT id_rutina FROM rutinas WHERE id_rutina = ? AND activa = 1', [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada.' });
    }

    const errorValidacion = await validarDias(dias);
    if (errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion });
    }

    await conexion.beginTransaction();

    if (nombre !== undefined) {
      await conexion.query('UPDATE rutinas SET nombre = ? WHERE id_rutina = ?', [nombre || null, id]);
    }
    await conexion.query('DELETE FROM rutina_ejercicios WHERE id_rutina = ?', [id]);
    await insertarEjercicios(conexion, id, dias);

    await conexion.commit();
    return res.json({ mensaje: 'Rutina actualizada exitosamente.' });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al actualizar rutina:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la rutina.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 5. ACTUALIZAR PESOS (el alumno en su propia rutina, o Admin/Profesor)
// ==========================================================
// Body: { pesos: [ { id_rutina_ejercicio: 12, peso_kg: 25 }, ... ] }
const actualizarPesos = async (req, res) => {
  try {
    const { id } = req.params;
    const { pesos } = req.body;

    if (!Array.isArray(pesos) || pesos.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron pesos para actualizar.' });
    }

    const [rutinas] = await db.query('SELECT id_alumno FROM rutinas WHERE id_rutina = ? AND activa = 1', [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada.' });
    }

    if (req.usuario.id_rol === ROL_ALUMNO && rutinas[0].id_alumno !== req.usuario.id_usuario) {
      return res.status(403).json({ mensaje: 'Solo podés modificar los pesos de tu propia rutina.' });
    }

    for (const p of pesos) {
      const peso = p.peso_kg === '' || p.peso_kg === undefined ? null : Number(p.peso_kg);
      if (peso !== null && (Number.isNaN(peso) || peso < 0)) {
        return res.status(400).json({ mensaje: 'Los pesos deben ser números positivos.' });
      }
      // La condición id_rutina impide modificar ejercicios de otra rutina
      await db.query(
        'UPDATE rutina_ejercicios SET peso_kg = ? WHERE id_rutina_ejercicio = ? AND id_rutina = ?',
        [peso, p.id_rutina_ejercicio, id]
      );
    }

    return res.json({ mensaje: 'Pesos actualizados.' });
  } catch (error) {
    console.error('Error al actualizar pesos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar los pesos.' });
  }
};

// ==========================================================
// 6. DAR DE BAJA RUTINA (Admin y Profesor)
// ==========================================================
// Queda archivada (activa = 0) y el alumno se queda sin rutina asignada.
const eliminarRutina = async (req, res) => {
  try {
    const [resultado] = await db.query(
      'UPDATE rutinas SET activa = 0 WHERE id_rutina = ? AND activa = 1',
      [req.params.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada.' });
    }

    return res.json({ mensaje: 'Rutina dada de baja.' });
  } catch (error) {
    console.error('Error al eliminar rutina:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja la rutina.' });
  }
};

module.exports = {
  obtenerEjercicios,
  crearEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
  miRutina,
  obtenerRutinaDeAlumno,
  crearRutina,
  actualizarRutina,
  actualizarPesos,
  eliminarRutina
};