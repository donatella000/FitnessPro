const db = require('../config/db');

// 1. Obtener todas las clases con sus horarios disponibles
const obtenerClases = async (req, res) => {
  try {
    const [clases] = await db.query(`
      SELECT 
        c.id_clase, 
        c.descripcion AS clase, 
        c.nombre_profesor,
        h.id_horario,
        h.dia_semana,
        h.hora_inicio,
        h.hora_fin,
        h.cupo_libre
      FROM clases c
      LEFT JOIN horarios_clase h ON c.id_clase = h.id_clase
      ORDER BY c.descripcion ASC, FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), h.hora_inicio ASC
    `);

    return res.json(clases);
  } catch (error) {
    console.error('Error al obtener clases:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener clases' });
  }
};

// 2. Crear una nueva clase (Admin y Profesor)
const crearClase = async (req, res) => {
  try {
    const { descripcion, nombre_profesor } = req.body;

    if (!descripcion) {
      return res.status(400).json({ mensaje: 'La descripción de la clase es obligatoria' });
    }

    const [resultado] = await db.query(
      'INSERT INTO clases (descripcion, nombre_profesor) VALUES (?, ?)',
      [descripcion, nombre_profesor || null]
    );

    return res.status(201).json({
      mensaje: 'Clase creada exitosamente',
      id_clase: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear clase:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear clase' });
  }
};

// 3. Modificar una clase (Admin y Profesor)
const actualizarClase = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, nombre_profesor } = req.body;

    const [resultado] = await db.query(`
      UPDATE clases SET
        descripcion = COALESCE(?, descripcion),
        nombre_profesor = COALESCE(?, nombre_profesor)
      WHERE id_clase = ?
    `, [descripcion, nombre_profesor, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Clase no encontrada' });
    }

    return res.json({ mensaje: 'Clase actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar clase:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar clase' });
  }
};

// 4. Eliminar una clase (Admin y Profesor)
const eliminarClase = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM clases WHERE id_clase = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Clase no encontrada' });
    }

    return res.json({ mensaje: 'Clase eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar clase:', error);
    return res.status(500).json({ mensaje: 'No se puede eliminar la clase si tiene horarios, turnos o suscripciones asociadas' });
  }
};

// 5. Agregar un horario a una clase (Admin y Profesor)
const agregarHorario = async (req, res) => {
  try {
    const { id_clase, dia_semana, hora_inicio, hora_fin, cupo_libre } = req.body;

    if (!id_clase || !dia_semana || !hora_inicio || !hora_fin || cupo_libre === undefined) {
      return res.status(400).json({ mensaje: 'Todos los campos del horario son obligatorios' });
    }

    const [resultado] = await db.query(
      'INSERT INTO horarios_clase (id_clase, dia_semana, hora_inicio, hora_fin, cupo_libre) VALUES (?, ?, ?, ?, ?)',
      [id_clase, dia_semana, hora_inicio, hora_fin, cupo_libre]
    );

    return res.status(201).json({
      mensaje: 'Horario asignado exitosamente',
      id_horario: resultado.insertId
    });
  } catch (error) {
    console.error('Error al agregar horario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al agregar horario' });
  }
};

// 6. Modificar o actualizar cupos de un horario (Admin y Profesor)
const actualizarHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, cupo_libre } = req.body;

    const [resultado] = await db.query(`
      UPDATE horarios_clase SET
        dia_semana = COALESCE(?, dia_semana),
        hora_inicio = COALESCE(?, hora_inicio),
        hora_fin = COALESCE(?, hora_fin),
        cupo_libre = COALESCE(?, cupo_libre)
      WHERE id_horario = ?
    `, [dia_semana, hora_inicio, hora_fin, cupo_libre, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    return res.json({ mensaje: 'Horario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 7. Eliminar un horario de clase (Admin y Profesor)
const eliminarHorario = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM horarios_clase WHERE id_horario = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    return res.json({ mensaje: 'Horario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    return res.status(500).json({ mensaje: 'No se puede eliminar el horario si ya tiene turnos reservados' });
  }
};

module.exports = {
  obtenerClases,
  crearClase,
  actualizarClase,
  eliminarClase,
  agregarHorario,
  actualizarHorario,
  eliminarHorario
};