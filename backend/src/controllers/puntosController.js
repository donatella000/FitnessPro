const db = require('../config/db');

const ROL_ALUMNO = 3;

const esStaff = (usuario) => usuario.id_rol !== ROL_ALUMNO;

// ==========================================================
// 1. CATÁLOGO DE PREMIOS
// ==========================================================

// Listar premios. Admin y Profesor pueden pedir ?incluirInactivos=1
const obtenerPremios = async (req, res) => {
  try {
    const verTodos = req.query.incluirInactivos && esStaff(req.usuario);
    const [premios] = await db.query(`
      SELECT id_premio, nombre, descripcion, valor_puntos, stock, activo
      FROM premios
      ${verTodos ? '' : 'WHERE activo = 1'}
      ORDER BY valor_puntos ASC
    `);
    return res.json(premios);
  } catch (error) {
    console.error('Error al obtener premios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el catálogo de premios.' });
  }
};

// stock vacío o null = ilimitado
const crearPremio = async (req, res) => {
  try {
    const { nombre, descripcion, valor_puntos, stock } = req.body;

    if (!nombre || !nombre.trim() || !(Number(valor_puntos) > 0)) {
      return res.status(400).json({ mensaje: 'El nombre y un valor en puntos mayor a cero son obligatorios.' });
    }
    if (stock !== undefined && stock !== null && stock !== '' && Number(stock) < 0) {
      return res.status(400).json({ mensaje: 'El stock no puede ser negativo.' });
    }

    const [resultado] = await db.query(
      'INSERT INTO premios (nombre, descripcion, valor_puntos, stock) VALUES (?, ?, ?, ?)',
      [nombre.trim(), descripcion || null, valor_puntos, stock === '' || stock === undefined ? null : stock]
    );

    return res.status(201).json({ mensaje: 'Premio creado exitosamente.', id_premio: resultado.insertId });
  } catch (error) {
    console.error('Error al crear premio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el premio.' });
  }
};

const actualizarPremio = async (req, res) => {
  try {
    const camposPermitidos = ['nombre', 'descripcion', 'valor_puntos', 'stock', 'activo'];
    const sets = [];
    const valores = [];

    if (req.body.valor_puntos !== undefined && !(Number(req.body.valor_puntos) > 0)) {
      return res.status(400).json({ mensaje: 'El valor en puntos debe ser mayor a cero.' });
    }
    if (req.body.nombre !== undefined && !String(req.body.nombre).trim()) {
      return res.status(400).json({ mensaje: 'El nombre no puede quedar vacío.' });
    }

    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        sets.push(`${campo} = ?`);
        // stock vacío significa ilimitado
        valores.push(req.body[campo] === '' ? null : req.body[campo]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron datos para actualizar.' });
    }

    valores.push(req.params.id);
    const [resultado] = await db.query(`UPDATE premios SET ${sets.join(', ')} WHERE id_premio = ?`, valores);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Premio no encontrado.' });
    }

    return res.json({ mensaje: 'Premio actualizado exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar premio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el premio.' });
  }
};

// Baja lógica: se conserva el historial de canjes
const eliminarPremio = async (req, res) => {
  try {
    const [resultado] = await db.query('UPDATE premios SET activo = 0 WHERE id_premio = ?', [req.params.id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Premio no encontrado.' });
    }

    return res.json({ mensaje: 'Premio dado de baja del catálogo.' });
  } catch (error) {
    console.error('Error al eliminar premio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja el premio.' });
  }
};

// ==========================================================
// 2. SALDO Y MOVIMIENTOS
// ==========================================================

// Saldo del usuario logueado con sus últimos movimientos y canjes
const miSaldo = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;

    const [usuarios] = await db.query('SELECT puntos FROM usuarios WHERE id_usuario = ?', [id_usuario]);

    const [movimientos] = await db.query(`
      SELECT id_movimiento, cantidad, motivo, descripcion, fecha
      FROM movimientos_puntos
      WHERE id_usuario = ?
      ORDER BY fecha DESC, id_movimiento DESC
      LIMIT 20
    `, [id_usuario]);

    const [canjes] = await db.query(`
      SELECT c.id_canje, p.nombre AS premio, c.puntos_usados, c.estado, c.fecha
      FROM canjes c
      INNER JOIN premios p ON c.id_premio = p.id_premio
      WHERE c.id_usuario = ?
      ORDER BY c.fecha DESC
    `, [id_usuario]);

    return res.json({ puntos: usuarios[0].puntos, movimientos, canjes });
  } catch (error) {
    console.error('Error al consultar saldo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al consultar el saldo de puntos.' });
  }
};

// Movimientos de un alumno (Admin y Profesor)
const movimientosDeUsuario = async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, apellido, puntos FROM usuarios WHERE id_usuario = ?',
      [req.params.id_usuario]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const [movimientos] = await db.query(`
      SELECT m.id_movimiento, m.cantidad, m.motivo, m.descripcion, m.fecha,
             CONCAT(r.nombre, ' ', r.apellido) AS registrado_por
      FROM movimientos_puntos m
      LEFT JOIN usuarios r ON m.registrado_por = r.id_usuario
      WHERE m.id_usuario = ?
      ORDER BY m.fecha DESC, m.id_movimiento DESC
    `, [req.params.id_usuario]);

    return res.json({ ...usuarios[0], movimientos });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener los movimientos.' });
  }
};

// ==========================================================
// 3. AJUSTE MANUAL DE PUNTOS (Admin y Profesor)
// ==========================================================
// Body: { id_usuario, cantidad, descripcion }
// cantidad positiva suma, negativa resta. El motivo es obligatorio para dejar registro.
const ajustarPuntos = async (req, res) => {
  const { id_usuario, cantidad, descripcion } = req.body;
  const conexion = await db.getConnection();

  try {
    const valor = Number(cantidad);

    if (!id_usuario || !Number.isInteger(valor) || valor === 0) {
      return res.status(400).json({ mensaje: 'Debe indicar el alumno y una cantidad entera distinta de cero.' });
    }
    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ mensaje: 'Debe indicar el motivo del ajuste.' });
    }

    await conexion.beginTransaction();

    const [usuarios] = await conexion.query(
      'SELECT puntos FROM usuarios WHERE id_usuario = ? AND id_rol = ? FOR UPDATE',
      [id_usuario, ROL_ALUMNO]
    );
    if (usuarios.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ mensaje: 'El alumno no existe.' });
    }

    const nuevoSaldo = usuarios[0].puntos + valor;
    if (nuevoSaldo < 0) {
      await conexion.rollback();
      return res.status(400).json({ mensaje: `El alumno tiene ${usuarios[0].puntos} puntos; no se le pueden restar ${-valor}.` });
    }

    await conexion.query('UPDATE usuarios SET puntos = ? WHERE id_usuario = ?', [nuevoSaldo, id_usuario]);
    await conexion.query(`
      INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, registrado_por)
      VALUES (?, ?, 'ajuste', ?, ?)
    `, [id_usuario, valor, descripcion.trim(), req.usuario.id_usuario]);

    await conexion.commit();
    return res.json({ mensaje: `Puntos ajustados. Nuevo saldo: ${nuevoSaldo}.`, puntos: nuevoSaldo });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al ajustar puntos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al ajustar los puntos.' });
  } finally {
    conexion.release();
  }
};

// ==========================================================
// 4. CANJES
// ==========================================================

// El usuario logueado canjea un premio. Body: { id_premio }
const canjearPremio = async (req, res) => {
  const { id_premio } = req.body;
  const { id_usuario } = req.usuario;
  const conexion = await db.getConnection();

  try {
    if (!id_premio) {
      return res.status(400).json({ mensaje: 'Debe elegir el premio a canjear.' });
    }

    await conexion.beginTransaction();

    // Se bloquean el premio y el saldo para evitar canjes simultáneos
    const [premios] = await conexion.query(
      'SELECT id_premio, nombre, valor_puntos, stock FROM premios WHERE id_premio = ? AND activo = 1 FOR UPDATE',
      [id_premio]
    );
    if (premios.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ mensaje: 'El premio no existe o ya no está disponible.' });
    }
    const premio = premios[0];

    if (premio.stock !== null && premio.stock <= 0) {
      await conexion.rollback();
      return res.status(400).json({ mensaje: 'Este premio no tiene stock disponible.' });
    }

    const [usuarios] = await conexion.query('SELECT puntos FROM usuarios WHERE id_usuario = ? FOR UPDATE', [id_usuario]);
    const saldo = usuarios[0].puntos;

    if (saldo < premio.valor_puntos) {
      await conexion.rollback();
      return res.status(400).json({
        mensaje: `Puntos insuficientes: tenés ${saldo} y este premio requiere ${premio.valor_puntos}.`
      });
    }

    const nuevoSaldo = saldo - premio.valor_puntos;

    await conexion.query('UPDATE usuarios SET puntos = ? WHERE id_usuario = ?', [nuevoSaldo, id_usuario]);

    if (premio.stock !== null) {
      await conexion.query('UPDATE premios SET stock = stock - 1 WHERE id_premio = ?', [id_premio]);
    }

    const [canje] = await conexion.query(
      'INSERT INTO canjes (id_usuario, id_premio, puntos_usados) VALUES (?, ?, ?)',
      [id_usuario, id_premio, premio.valor_puntos]
    );

    await conexion.query(`
      INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion)
      VALUES (?, ?, 'canje', ?)
    `, [id_usuario, -premio.valor_puntos, `Canje: ${premio.nombre}`]);

    await conexion.commit();

    return res.json({
      mensaje: `¡Canjeaste "${premio.nombre}"! Retiralo en recepción.`,
      id_canje: canje.insertId,
      puntos: nuevoSaldo
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al canjear premio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al procesar el canje.' });
  } finally {
    conexion.release();
  }
};

// Listar canjes (Admin y Profesor). Filtros: ?estado=pendiente  ?id_usuario=8
const listarCanjes = async (req, res) => {
  try {
    const condiciones = [];
    const valores = [];

    if (req.query.estado) {
      condiciones.push('c.estado = ?');
      valores.push(req.query.estado);
    }
    if (req.query.id_usuario) {
      condiciones.push('c.id_usuario = ?');
      valores.push(req.query.id_usuario);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const [canjes] = await db.query(`
      SELECT c.id_canje, c.fecha, c.estado, c.puntos_usados,
             u.id_usuario, u.nombre, u.apellido, u.dni, p.nombre AS premio
      FROM canjes c
      INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
      INNER JOIN premios p ON c.id_premio = p.id_premio
      ${where}
      ORDER BY c.fecha DESC
    `, valores);

    return res.json(canjes);
  } catch (error) {
    console.error('Error al listar canjes:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al listar los canjes.' });
  }
};

// Marcar un canje como entregado (Admin y Profesor)
const entregarCanje = async (req, res) => {
  try {
    const [resultado] = await db.query(
      "UPDATE canjes SET estado = 'entregado' WHERE id_canje = ? AND estado = 'pendiente'",
      [req.params.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Canje no encontrado o ya entregado.' });
    }

    return res.json({ mensaje: 'Canje marcado como entregado.' });
  } catch (error) {
    console.error('Error al entregar canje:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el canje.' });
  }
};

module.exports = {
  obtenerPremios,
  crearPremio,
  actualizarPremio,
  eliminarPremio,
  miSaldo,
  movimientosDeUsuario,
  ajustarPuntos,
  canjearPremio,
  listarCanjes,
  entregarCanje
};