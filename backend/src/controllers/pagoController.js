const db = require('../config/db');

// ==========================================
// 1. REGISTRAR UN NUEVO PAGO (Admin y Profesor)
// ==========================================
const registrarPago = async (req, res) => {
  try {
    const {
      id_usuario,
      id_suscripcion,
      fecha_inicio_validez,
      fecha_pago,
      fecha_fin_validez,
      metodo_pago
    } = req.body;

    // Validación de campos obligatorios
    if (!id_usuario || !id_suscripcion || !fecha_inicio_validez || !fecha_pago || !fecha_fin_validez || !metodo_pago) {
      return res.status(400).json({
        mensaje: 'Todos los campos son obligatorios: id_usuario, id_suscripcion, fecha_inicio_validez, fecha_pago, fecha_fin_validez y metodo_pago'
      });
    }

    // A. Validar que el usuario exista
    const [usuarios] = await db.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'El usuario especificado no existe' });
    }

    // B. Obtener información del plan de suscripción para evaluar el recargo
    const [suscripciones] = await db.query(
      'SELECT id_suscripcion, precio, recargo, fecha_limite FROM suscripcion WHERE id_suscripcion = ?',
      [id_suscripcion]
    );

    if (suscripciones.length === 0) {
      return res.status(404).json({ mensaje: 'El plan de suscripción especificado no existe' });
    }

    const suscripcion = suscripciones[0];

    // C. Calcular recargo si la fecha de pago superó la fecha límite del mes
    let recargoAplicado = 0;
    const diaPago = new Date(fecha_pago).getUTCDate();
    const diaLimite = new Date(suscripcion.fecha_limite).getUTCDate();

    if (diaPago > diaLimite) {
      recargoAplicado = Number(suscripcion.recargo) || 0;
    }

    // D. Insertar el comprobante de pago en MySQL
    const [resultado] = await db.query(`
      INSERT INTO pagos (
        id_usuario,
        id_suscripcion,
        fecha_inicio_validez,
        fecha_pago,
        fecha_fin_validez,
        monto_recargo,
        metodo_pago
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id_usuario,
      id_suscripcion,
      fecha_inicio_validez,
      fecha_pago,
      fecha_fin_validez,
      recargoAplicado,
      metodo_pago
    ]);

    // E. Actualizar el plan activo en el perfil del usuario
    await db.query('UPDATE usuarios SET id_suscripcion = ? WHERE id_usuario = ?', [id_suscripcion, id_usuario]);

    return res.status(201).json({
      mensaje: 'Pago registrado exitosamente',
      id_pago: resultado.insertId,
      monto_recargo: recargoAplicado
    });

  } catch (error) {
    console.error('Error al registrar pago:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al registrar el pago' });
  }
};

// ==========================================
// 2. LISTAR PAGOS (Admin/Profe ven todos, Alumno ve los propios)
// ==========================================
const listarPagos = async (req, res) => {
  try {
    const { id_usuario, id_rol } = req.usuario;

    let query = `
      SELECT 
        p.id_pagos,
        p.id_usuario,
        u.nombre,
        u.apellido,
        u.dni,
        p.id_suscripcion,
        s.descripcion AS plan_suscripcion,
        s.precio AS precio_base,
        p.monto_recargo,
        (s.precio + p.monto_recargo) AS monto_total,
        p.fecha_inicio_validez,
        p.fecha_pago,
        p.fecha_fin_validez,
        p.metodo_pago
      FROM pagos p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      INNER JOIN suscripcion s ON p.id_suscripcion = s.id_suscripcion
    `;

    const params = [];

    // Si el usuario solicitante es Alumno (id_rol = 3), solo visualiza sus propios comprobantes
    if (id_rol === 3) {
      query += ' WHERE p.id_usuario = ?';
      params.push(id_usuario);
    }

    query += ' ORDER BY p.fecha_pago DESC, p.id_pagos DESC';

    const [pagos] = await db.query(query, params);
    return res.json(pagos);

  } catch (error) {
    console.error('Error al listar pagos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al listar los pagos' });
  }
};

// ==========================================
// 3. OBTENER DETALLE DE UN PAGO POR ID
// ==========================================
const obtenerPagoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario, id_rol } = req.usuario;

    const [pagos] = await db.query(`
      SELECT 
        p.id_pagos,
        p.id_usuario,
        u.nombre,
        u.apellido,
        u.dni,
        p.id_suscripcion,
        s.descripcion AS plan_suscripcion,
        s.precio AS precio_base,
        p.monto_recargo,
        (s.precio + p.monto_recargo) AS monto_total,
        p.fecha_inicio_validez,
        p.fecha_pago,
        p.fecha_fin_validez,
        p.metodo_pago
      FROM pagos p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      INNER JOIN suscripcion s ON p.id_suscripcion = s.id_suscripcion
      WHERE p.id_pagos = ?
    `, [id]);

    if (pagos.length === 0) {
      return res.status(404).json({ mensaje: 'Comprobante de pago no encontrado' });
    }

    const pago = pagos[0];

    // Restricción de seguridad: el alumno solo puede consultar sus propios recibos
    if (id_rol === 3 && pago.id_usuario !== id_usuario) {
      return res.status(403).json({ mensaje: 'Acceso denegado: No tenés permiso para ver este comprobante' });
    }

    return res.json(pago);

  } catch (error) {
    console.error('Error al obtener pago:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el comprobante de pago' });
  }
};

// ==========================================
// 4. ACTUALIZAR DATOS DE UN PAGO (Admin y Profesor)
// ==========================================
const actualizarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha_inicio_validez,
      fecha_pago,
      fecha_fin_validez,
      monto_recargo,
      metodo_pago
    } = req.body;

    const [resultado] = await db.query(`
      UPDATE pagos SET
        fecha_inicio_validez = COALESCE(?, fecha_inicio_validez),
        fecha_pago = COALESCE(?, fecha_pago),
        fecha_fin_validez = COALESCE(?, fecha_fin_validez),
        monto_recargo = COALESCE(?, monto_recargo),
        metodo_pago = COALESCE(?, metodo_pago)
      WHERE id_pagos = ?
    `, [fecha_inicio_validez, fecha_pago, fecha_fin_validez, monto_recargo, metodo_pago, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Comprobante de pago no encontrado' });
    }

    return res.json({ mensaje: 'Comprobante de pago actualizado exitosamente' });

  } catch (error) {
    console.error('Error al actualizar pago:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el pago' });
  }
};

// ==========================================
// 5. ELIMINAR REGISTRO DE PAGO (Solo Admin)
// ==========================================
const eliminarPago = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM pagos WHERE id_pagos = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Comprobante de pago no encontrado' });
    }

    return res.json({ mensaje: 'Comprobante de pago eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar pago:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el pago' });
  }
};

module.exports = {
  registrarPago,
  listarPagos,
  obtenerPagoPorId,
  actualizarPago,
  eliminarPago
};