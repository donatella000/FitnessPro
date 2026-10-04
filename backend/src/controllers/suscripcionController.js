const db = require('../config/db');

const ROL_ADMIN = 1;

// Descuentos de los planes estándar respecto de pagar meses sueltos
const DESCUENTO_SEMESTRAL = 0.20;
const DESCUENTO_ANUAL = 0.30;

// Turnos que corresponden a un plan: veces por semana x 4 semanas x cantidad de meses.
// Ejemplo: 3 veces por semana, 30 días -> 12 turnos; 180 días -> 72; 360 días -> 144.
const calcularTurnos = (veces_por_semana, duracion_dias) =>
  Number(veces_por_semana) * 4 * Math.round(Number(duracion_dias) / 30);

const CAMPOS_SUSCRIPCION = `
  s.id_suscripcion, s.id_actividad, a.nombre AS actividad, a.tipo AS tipo_actividad,
  s.nombre, s.duracion_dias, s.veces_por_semana, s.cantidad_turnos, s.precio, s.activo
`;

const actividadActiva = async (id_actividad) => {
  const [filas] = await db.query(
    'SELECT id_actividad, nombre FROM actividades WHERE id_actividad = ? AND activo = 1',
    [id_actividad]
  );
  return filas[0] || null;
};

// ==========================================
// 1. LISTAR SUSCRIPCIONES
// ==========================================
// Filtros: ?id_actividad=2   ?incluirInactivas=1 (solo admin)
const obtenerSuscripciones = async (req, res) => {
  try {
    const { id_actividad, incluirInactivas } = req.query;
    const condiciones = [];
    const valores = [];

    if (!(incluirInactivas && req.usuario.id_rol === ROL_ADMIN)) {
      condiciones.push('s.activo = 1', 'a.activo = 1');
    }
    if (id_actividad) {
      condiciones.push('s.id_actividad = ?');
      valores.push(id_actividad);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [suscripciones] = await db.query(`
      SELECT ${CAMPOS_SUSCRIPCION}
      FROM suscripciones s
      INNER JOIN actividades a ON s.id_actividad = a.id_actividad
      ${where}
      ORDER BY a.nombre, s.veces_por_semana, s.duracion_dias
    `, valores);

    return res.json(suscripciones);
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener suscripciones.' });
  }
};

// ==========================================
// 2. OBTENER UNA SUSCRIPCIÓN POR ID
// ==========================================
const obtenerSuscripcionPorId = async (req, res) => {
  try {
    const [suscripciones] = await db.query(`
      SELECT ${CAMPOS_SUSCRIPCION}
      FROM suscripciones s
      INNER JOIN actividades a ON s.id_actividad = a.id_actividad
      WHERE s.id_suscripcion = ?
    `, [req.params.id]);

    if (suscripciones.length === 0) {
      return res.status(404).json({ mensaje: 'Suscripción no encontrada.' });
    }

    return res.json(suscripciones[0]);
  } catch (error) {
    console.error('Error al obtener suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la suscripción.' });
  }
};

// ==========================================
// 3. CREAR UNA SUSCRIPCIÓN (Solo Admin)
// ==========================================
// Si no se envía cantidad_turnos, se calcula automáticamente.
const crearSuscripcion = async (req, res) => {
  try {
    const { id_actividad, nombre, duracion_dias, veces_por_semana, precio } = req.body;
    let { cantidad_turnos } = req.body;

    if (!id_actividad || !nombre || !duracion_dias || !veces_por_semana || precio === undefined) {
      return res.status(400).json({
        mensaje: 'Los campos actividad, nombre, duración en días, veces por semana y precio son obligatorios.'
      });
    }
    if (Number(duracion_dias) < 1 || Number(veces_por_semana) < 1 || Number(veces_por_semana) > 7) {
      return res.status(400).json({ mensaje: 'La duración o las veces por semana no son válidas.' });
    }
    if (Number(precio) < 0) {
      return res.status(400).json({ mensaje: 'El precio no puede ser negativo.' });
    }

    if (!(await actividadActiva(id_actividad))) {
      return res.status(404).json({ mensaje: 'La actividad no existe o está dada de baja.' });
    }

    if (!cantidad_turnos) {
      cantidad_turnos = calcularTurnos(veces_por_semana, duracion_dias);
    }

    const [resultado] = await db.query(`
      INSERT INTO suscripciones (id_actividad, nombre, duracion_dias, veces_por_semana, cantidad_turnos, precio)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id_actividad, nombre.trim(), duracion_dias, veces_por_semana, cantidad_turnos, precio]);

    return res.status(201).json({
      mensaje: 'Suscripción creada exitosamente.',
      id_suscripcion: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la suscripción.' });
  }
};

// ==========================================
// 4. GENERAR LOS 3 PLANES ESTÁNDAR (Solo Admin)
// ==========================================
// A partir del precio mensual crea los planes mensual, semestral (-20%) y anual (-30%).
// Body: { "id_actividad": 2, "veces_por_semana": 3, "precio_mensual": 50000 }
const generarPlanes = async (req, res) => {
  const conexion = await db.getConnection();

  try {
    const { id_actividad, veces_por_semana, precio_mensual } = req.body;

    if (!id_actividad || !veces_por_semana || !precio_mensual) {
      return res.status(400).json({
        mensaje: 'Debe indicar la actividad, las veces por semana y el precio mensual.'
      });
    }

    const actividad = await actividadActiva(id_actividad);
    if (!actividad) {
      return res.status(404).json({ mensaje: 'La actividad no existe o está dada de baja.' });
    }

    const mensual = Number(precio_mensual);
    const planes = [
      { tipo: 'mensual', dias: 30, precio: mensual },
      { tipo: 'semestral', dias: 180, precio: Math.round(mensual * 6 * (1 - DESCUENTO_SEMESTRAL)) },
      { tipo: 'anual', dias: 360, precio: Math.round(mensual * 12 * (1 - DESCUENTO_ANUAL)) }
    ];

    await conexion.beginTransaction();

    const creados = [];
    for (const plan of planes) {
      const nombre = `${actividad.nombre} ${plan.tipo} ${veces_por_semana}x semana`;
      const turnos = calcularTurnos(veces_por_semana, plan.dias);

      const [resultado] = await conexion.query(`
        INSERT INTO suscripciones (id_actividad, nombre, duracion_dias, veces_por_semana, cantidad_turnos, precio)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id_actividad, nombre, plan.dias, veces_por_semana, turnos, plan.precio]);

      creados.push({ id_suscripcion: resultado.insertId, nombre, cantidad_turnos: turnos, precio: plan.precio });
    }

    await conexion.commit();

    return res.status(201).json({ mensaje: 'Se crearon los 3 planes.', planes: creados });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al generar planes:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al generar los planes.' });
  } finally {
    conexion.release();
  }
};

// ==========================================
// 5. ACTUALIZAR SUSCRIPCIÓN (Solo Admin)
// ==========================================
// Los cambios no afectan a los alumnos que ya la pagaron: su vigencia,
// turnos y monto quedaron guardados al momento del pago.
const actualizarSuscripcion = async (req, res) => {
  try {
    const camposPermitidos = ['nombre', 'duracion_dias', 'veces_por_semana', 'cantidad_turnos', 'precio', 'activo'];
    const sets = [];
    const valores = [];

    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined && req.body[campo] !== '') {
        sets.push(`${campo} = ?`);
        valores.push(req.body[campo]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron datos para actualizar.' });
    }

    valores.push(req.params.id);
    const [resultado] = await db.query(
      `UPDATE suscripciones SET ${sets.join(', ')} WHERE id_suscripcion = ?`,
      valores
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Suscripción no encontrada.' });
    }

    return res.json({ mensaje: 'Suscripción actualizada exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la suscripción.' });
  }
};

// ==========================================
// 6. DAR DE BAJA SUSCRIPCIÓN (Solo Admin)
// ==========================================
// Deja de ofrecerse, pero los alumnos que ya la tienen la conservan hasta que venza.
const eliminarSuscripcion = async (req, res) => {
  try {
    const [resultado] = await db.query(
      'UPDATE suscripciones SET activo = 0 WHERE id_suscripcion = ?',
      [req.params.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Suscripción no encontrada.' });
    }

    return res.json({ mensaje: 'Suscripción dada de baja. Los alumnos que ya la pagaron la conservan hasta su vencimiento.' });
  } catch (error) {
    console.error('Error al eliminar suscripción:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja la suscripción.' });
  }
};

module.exports = {
  obtenerSuscripciones,
  obtenerSuscripcionPorId,
  crearSuscripcion,
  generarPlanes,
  actualizarSuscripcion,
  eliminarSuscripcion
};