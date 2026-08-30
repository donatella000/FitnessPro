const db = require('../config/db');

// ==========================================
// 1. GESTIÓN DEL CATÁLOGO DE EJERCICIOS
// ==========================================

// Obtener todos los ejercicios
const obtenerEjercicios = async (req, res) => {
  try {
    const [ejercicios] = await db.query(
      'SELECT id_ejercicios, grupo_muscular, descripcion FROM ejercicios ORDER BY grupo_muscular ASC, descripcion ASC'
    );
    return res.json(ejercicios);
  } catch (error) {
    console.error('Error al obtener ejercicios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener ejercicios' });
  }
};

// Crear un nuevo ejercicio (Admin y Profesor)
const crearEjercicio = async (req, res) => {
  try {
    const { grupo_muscular, descripcion } = req.body;

    if (!grupo_muscular || !descripcion) {
      return res.status(400).json({ mensaje: 'El grupo muscular y la descripción son obligatorios' });
    }

    const [resultado] = await db.query(
      'INSERT INTO ejercicios (grupo_muscular, descripcion) VALUES (?, ?)',
      [grupo_muscular, descripcion]
    );

    return res.status(201).json({
      mensaje: 'Ejercicio creado exitosamente',
      id_ejercicios: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear ejercicio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear ejercicio' });
  }
};

// Modificar un ejercicio (Admin y Profesor)
const actualizarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { grupo_muscular, descripcion } = req.body;

    const [resultado] = await db.query(
      `UPDATE ejercicios SET
        grupo_muscular = COALESCE(?, grupo_muscular),
        descripcion = COALESCE(?, descripcion)
      WHERE id_ejercicios = ?`,
      [grupo_muscular, descripcion, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ejercicio no encontrado' });
    }

    return res.json({ mensaje: 'Ejercicio actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar ejercicio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar ejercicio' });
  }
};

// Eliminar un ejercicio (Admin y Profesor)
const eliminarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM ejercicios WHERE id_ejercicios = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Ejercicio no encontrado' });
    }

    return res.json({ mensaje: 'Ejercicio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar ejercicio:', error);
    return res.status(500).json({ mensaje: 'No se puede eliminar el ejercicio porque está asignado en una rutina activa' });
  }
};

// ==========================================
// 2. GESTIÓN DE RUTINAS
// ==========================================

// Obtener rutinas de un usuario específico
const obtenerRutinaPorUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { id_usuario: tokenUsuarioId, id_rol } = req.usuario;

    // Si es alumno, solo puede consultar su propia rutina
    if (id_rol === 3 && parseInt(id_usuario) !== tokenUsuarioId) {
      return res.status(403).json({ mensaje: 'Acceso denegado: Solo podés ver tu propia rutina' });
    }

    const [rutinas] = await db.query(`
      SELECT 
        r.id_rutina, r.id_usuario, r.dia,
        e1.descripcion AS ej1_nombre, e1.grupo_muscular AS ej1_grupo, r.series_1, r.repeticiones_1, r.peso_1,
        e2.descripcion AS ej2_nombre, e2.grupo_muscular AS ej2_grupo, r.series_2, r.repeticiones_2, r.peso_2,
        e3.descripcion AS ej3_nombre, e3.grupo_muscular AS ej3_grupo, r.series_3, r.repeticiones_3, r.peso_3,
        e4.descripcion AS ej4_nombre, e4.grupo_muscular AS ej4_grupo, r.series_4, r.repeticiones_4, r.peso_4,
        e5.descripcion AS ej5_nombre, e5.grupo_muscular AS ej5_grupo, r.series_5, r.repeticiones_5, r.peso_5,
        e6.descripcion AS ej6_nombre, e6.grupo_muscular AS ej6_grupo, r.series_6, r.repeticiones_6, r.peso_6,
        e7.descripcion AS ej7_nombre, e7.grupo_muscular AS ej7_grupo, r.series_7, r.repeticiones_7, r.peso_7,
        e8.descripcion AS ej8_nombre, e8.grupo_muscular AS ej8_grupo, r.series_8, r.repeticiones_8, r.peso_8
      FROM rutina r
      LEFT JOIN ejercicios e1 ON r.id_ejercicio_1 = e1.id_ejercicios
      LEFT JOIN ejercicios e2 ON r.id_ejercicio_2 = e2.id_ejercicios
      LEFT JOIN ejercicios e3 ON r.id_ejercicio_3 = e3.id_ejercicios
      LEFT JOIN ejercicios e4 ON r.id_ejercicio_4 = e4.id_ejercicios
      LEFT JOIN ejercicios e5 ON r.id_ejercicio_5 = e5.id_ejercicios
      LEFT JOIN ejercicios e6 ON r.id_ejercicio_6 = e6.id_ejercicios
      LEFT JOIN ejercicios e7 ON r.id_ejercicio_7 = e7.id_ejercicios
      LEFT JOIN ejercicios e8 ON r.id_ejercicio_8 = e8.id_ejercicios
      WHERE r.id_usuario = ?
      ORDER BY r.dia ASC
    `, [id_usuario]);

    return res.json(rutinas);
  } catch (error) {
    console.error('Error al obtener rutinas:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la rutina' });
  }
};

// Crear una rutina completa para un alumno (Admin y Profesor)
const crearRutina = async (req, res) => {
  try {
    const {
      id_usuario, dia,
      id_ejercicio_1, repeticiones_1, series_1, peso_1,
      id_ejercicio_2, repeticiones_2, series_2, peso_2,
      id_ejercicio_3, repeticiones_3, series_3, peso_3,
      id_ejercicio_4, repeticiones_4, series_4, peso_4,
      id_ejercicio_5, repeticiones_5, series_5, peso_5,
      id_ejercicio_6, repeticiones_6, series_6, peso_6,
      id_ejercicio_7, repeticiones_7, series_7, peso_7,
      id_ejercicio_8, repeticiones_8, series_8, peso_8
    } = req.body;

    if (!id_usuario || dia === undefined) {
      return res.status(400).json({ mensaje: 'El ID del usuario y el día de rutina son obligatorios' });
    }

    const [resultado] = await db.query(`
      INSERT INTO rutina (
        id_usuario, dia,
        id_ejercicio_1, repeticiones_1, series_1, peso_1,
        id_ejercicio_2, repeticiones_2, series_2, peso_2,
        id_ejercicio_3, repeticiones_3, series_3, peso_3,
        id_ejercicio_4, repeticiones_4, series_4, peso_4,
        id_ejercicio_5, repeticiones_5, series_5, peso_5,
        id_ejercicio_6, repeticiones_6, series_6, peso_6,
        id_ejercicio_7, repeticiones_7, series_7, peso_7,
        id_ejercicio_8, repeticiones_8, series_8, peso_8
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_usuario, dia,
      id_ejercicio_1, repeticiones_1, series_1, peso_1,
      id_ejercicio_2, repeticiones_2, series_2, peso_2,
      id_ejercicio_3, repeticiones_3, series_3, peso_3,
      id_ejercicio_4, repeticiones_4, series_4, peso_4,
      id_ejercicio_5, repeticiones_5, series_5, peso_5,
      id_ejercicio_6, repeticiones_6, series_6, peso_6,
      id_ejercicio_7, repeticiones_7, series_7, peso_7,
      id_ejercicio_8, repeticiones_8, series_8, peso_8
    ]);

    return res.status(201).json({
      mensaje: 'Rutina creada exitosamente para el alumno',
      id_rutina: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear rutina:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la rutina' });
  }
};

// Actualizar rutina completa (Admin y Profesor)
const actualizarRutinaCompleta = async (req, res) => {
  try {
    const { id } = req.params;
    const campos = req.body;

    const [resultado] = await db.query(
      'UPDATE rutina SET ? WHERE id_rutina = ?',
      [campos, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    }

    return res.json({ mensaje: 'Rutina actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar rutina completa:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la rutina' });
  }
};

// Actualizar únicamente los pesos de los ejercicios (Permitido para el Alumno)
const actualizarPesosRutina = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario, id_rol } = req.usuario;
    const { peso_1, peso_2, peso_3, peso_4, peso_5, peso_6, peso_7, peso_8 } = req.body;

    // Verificar si la rutina existe y si le pertenece al alumno
    const [rutinas] = await db.query('SELECT id_usuario FROM rutina WHERE id_rutina = ?', [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    }

    if (id_rol === 3 && rutinas[0].id_usuario !== id_usuario) {
      return res.status(403).json({ mensaje: 'Acceso denegado: No podés modificar los pesos de la rutina de otro alumno' });
    }

    await db.query(`
      UPDATE rutina SET
        peso_1 = COALESCE(?, peso_1),
        peso_2 = COALESCE(?, peso_2),
        peso_3 = COALESCE(?, peso_3),
        peso_4 = COALESCE(?, peso_4),
        peso_5 = COALESCE(?, peso_5),
        peso_6 = COALESCE(?, peso_6),
        peso_7 = COALESCE(?, peso_7),
        peso_8 = COALESCE(?, peso_8)
      WHERE id_rutina = ?
    `, [peso_1, peso_2, peso_3, peso_4, peso_5, peso_6, peso_7, peso_8, id]);

    return res.json({ mensaje: 'Pesos actualizados exitosamente en tu rutina' });
  } catch (error) {
    console.error('Error al actualizar pesos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al registrar pesos' });
  }
};

// Eliminar rutina (Admin y Profesor)
const eliminarRutina = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM rutina WHERE id_rutina = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    }

    return res.json({ mensaje: 'Rutina eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar rutina:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar la rutina' });
  }
};

module.exports = {
  obtenerEjercicios,
  crearEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
  obtenerRutinaPorUsuario,
  crearRutina,
  actualizarRutinaCompleta,
  actualizarPesosRutina,
  eliminarRutina
};