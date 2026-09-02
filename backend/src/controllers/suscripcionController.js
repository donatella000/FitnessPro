const db = require('../config/db');

// ==========================================
// 1. OBTENER TODAS LAS SUSCRIPCIONES / PLANES
// ==========================================
const obtenerSuscripciones = async (req, res) => {
  try {
    const [suscripciones] = await db.query(`
      SELECT 
        s.id_suscripcion, 
        s.descripcion, 
        s.precio, 
        s.id_clase, 
        c.descripcion AS nombre_clase,
        s.recargo, 
        s.fecha_limite, 
        s.veces_por_mes
      FROM suscripcion s
      INNER JOIN clases c ON s.id_clase = c.id_clase
      ORDER BY s.precio ASC
    `);

    return res.json(suscripciones);
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener suscripciones' });
  }
};

// ==========================================
// 2. OBTENER UNA SUSCRIPCIÓN POR ID
// ==========================================
const obtenerSuscripcionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [suscripciones] = await db.query(`
      SELECT 
        s.id_suscripcion, 
        s.descripcion, 
        s.precio, 
        s.id_clase, 
        c.descripcion AS nombre_clase,
        s.recargo, 
        s.fecha_limite, 
        s.veces_por_mes
      FROM suscripcion s
      INNER JOIN clases c ON s.id_clase = c.id_clase
      WHERE s.id_suscripcion = ?
    `, [id]);

    if (suscripciones.length === 0) {
      return res.status(404).json({ mensaje: 'Suscripción no encontrada' });
    }

    return res.json(suscripciones[0]);
  } catch (error) {
    console.error('Error al obtener suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la suscripción' });
  }
};

// ==========================================
// 3. CREAR NUEVA SUSCRIPCIÓN / PLAN (Solo Admin)
// ==========================================
const crearSuscripcion = async (req, res) => {
  try {
    const { descripcion, precio, id_clase, recargo, fecha_limite, veces_por_mes } = req.body;

    // Validación de campos requeridos
    if (!descripcion || precio === undefined || !id_clase || !fecha_limite || veces_por_mes === undefined) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios: descripcion, precio, id_clase, fecha_limite y veces_por_mes' });
    }

    // Verificar si la clase asociada existe
    const [clase] = await db.query('SELECT id_clase FROM clases WHERE id_clase = ?', [id_clase]);
    if (clase.length === 0) {
      return res.status(404).json({ mensaje: 'La clase asignada a la suscripción no existe' });
    }

    const [resultado] = await db.query(`
      INSERT INTO suscripcion (descripcion, precio, id_clase, recargo, fecha_limite, veces_por_mes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [descripcion, precio, id_clase, recargo || 0.00, fecha_limite, veces_por_mes]);

    return res.status(201).json({
      mensaje: 'Suscripción creada exitosamente',
      id_suscripcion: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la suscripción' });
  }
};

// ==========================================
// 4. ACTUALIZAR SUSCRIPCIÓN (Solo Admin)
// ==========================================
const actualizarSuscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, precio, id_clase, recargo, fecha_limite, veces_por_mes } = req.body;

    const [resultado] = await db.query(`
      UPDATE suscripcion SET
        descripcion = COALESCE(?, descripcion),
        precio = COALESCE(?, precio),
        id_clase = COALESCE(?, id_clase),
        recargo = COALESCE(?, recargo),
        fecha_limite = COALESCE(?, fecha_limite),
        veces_por_mes = COALESCE(?, veces_por_mes)
      WHERE id_suscripcion = ?
    `, [descripcion, precio, id_clase, recargo, fecha_limite, veces_por_mes, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Suscripción no encontrada' });
    }

    return res.json({ mensaje: 'Suscripción actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la suscripción' });
  }
};

// ==========================================
// 5. ELIMINAR SUSCRIPCIÓN (Solo Admin)
// ==========================================
const eliminarSuscripcion = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM suscripcion WHERE id_suscripcion = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Suscripción no encontrada' });
    }

    return res.json({ mensaje: 'Suscripción eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar suscripción:', error);
    return res.status(500).json({ mensaje: 'No se puede eliminar la suscripción porque hay usuarios o pagos vinculados a ella' });
  }
};

// ==========================================
// 6. SELECCIONAR / ASIGNAR SUSCRIPCIÓN A UN USUARIO
// ==========================================
const seleccionarSuscripcion = async (req, res) => {
  try {
    const { id_suscripcion, id_usuario_destino } = req.body;
    const { id_usuario, id_rol } = req.usuario;

    if (!id_suscripcion) {
      return res.status(400).json({ mensaje: 'Debe especificar el id_suscripcion' });
    }

    // Verificar si la suscripción existe
    const [suscripcion] = await db.query('SELECT id_suscripcion FROM suscripcion WHERE id_suscripcion = ?', [id_suscripcion]);
    if (suscripcion.length === 0) {
      return res.status(404).json({ mensaje: 'El plan de suscripción seleccionado no existe' });
    }

    // Si es admin puede asignársela a cualquiera; si es alumno, solo a sí mismo
    let usuarioAfectado = id_usuario;
    if (id_rol === 1 && id_usuario_destino) {
      usuarioAfectado = id_usuario_destino;
    }

    await db.query('UPDATE usuarios SET id_suscripcion = ? WHERE id_usuario = ?', [id_suscripcion, usuarioAfectado]);

    return res.json({ mensaje: 'Plan de suscripción asignado correctamente al usuario' });
  } catch (error) {
    console.error('Error al seleccionar suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al asignar la suscripción' });
  }
};

module.exports = {
  obtenerSuscripciones,
  obtenerSuscripcionPorId,
  crearSuscripcion,
  actualizarSuscripcion,
  eliminarSuscripcion,
  seleccionarSuscripcion
};