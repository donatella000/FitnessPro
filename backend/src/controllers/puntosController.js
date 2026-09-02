const db = require('../config/db');

// ==========================================
// 1. OBTENER CATÁLOGO DE PRODUCTOS / PREMIOS
// ==========================================
const obtenerProductosCanje = async (req, res) => {
  try {
    const [productos] = await db.query(
      'SELECT id_producto, descripcion, valor_puntos FROM canjes ORDER BY valor_puntos ASC'
    );
    return res.json(productos);
  } catch (error) {
    console.error('Error al obtener catalogo de canjes:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el catálogo de premios.' });
  }
};

// ==========================================
// 2. CREAR PRODUCTO PARA CANJE (Solo Admin)
// ==========================================
const crearProductoCanje = async (req, res) => {
  try {
    const { descripcion, valor_puntos } = req.body;

    if (!descripcion || valor_puntos === undefined || valor_puntos <= 0) {
      return res.status(400).json({
        mensaje: 'La descripción y un valor de puntos válido son obligatorios.'
      });
    }

    const [resultado] = await db.query(
      'INSERT INTO canjes (descripcion, valor_puntos) VALUES (?, ?)',
      [descripcion, valor_puntos]
    );

    return res.status(201).json({
      mensaje: '¡Premio creado exitosamente en el catálogo!',
      id_producto: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear producto de canje:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear producto para canje.' });
  }
};

// ==========================================
// 3. MODIFICAR PRODUCTO DE CANJE (Solo Admin)
// ==========================================
const actualizarProductoCanje = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, valor_puntos } = req.body;

    const [resultado] = await db.query(`
      UPDATE canjes SET
        descripcion = COALESCE(?, descripcion),
        valor_puntos = COALESCE(?, valor_puntos)
      WHERE id_producto = ?
    `, [descripcion, valor_puntos, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Premio no encontrado.' });
    }

    return res.json({ mensaje: '¡Premio actualizado exitosamente!' });
  } catch (error) {
    console.error('Error al actualizar producto de canje:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar producto.' });
  }
};

// ==========================================
// 4. ELIMINAR PRODUCTO DE CANJE (Solo Admin)
// ==========================================
const eliminarProductoCanje = async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query('DELETE FROM canjes WHERE id_producto = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Producto de canje no encontrado.' });
    }

    return res.json({ mensaje: 'Producto de canje eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar producto de canje:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar producto.' });
  }
};

// ==========================================
// 5. CONSULTAR SALDO DE PUNTOS PROPIO
// ==========================================
const consultarSaldoPuntos = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;

    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, apellido, puntos FROM usuarios WHERE id_usuario = ?',
      [id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    return res.json(usuarios[0]);
  } catch (error) {
    console.error('Error al consultar saldo de puntos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al consultar saldo de puntos.' });
  }
};

// ==========================================
// 6. REALIZAR CANJE DE PUNTOS POR UN PRODUCTO (Alumno)
// ==========================================
const realizarCanje = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;
    const { id_producto } = req.body;

    if (!id_producto) {
      return res.status(400).json({ mensaje: 'Debe especificar el premio a canjear.' });
    }

    // A. Consultar el producto y su valor en puntos
    const [productos] = await db.query(
      'SELECT id_producto, descripcion, valor_puntos FROM canjes WHERE id_producto = ?',
      [id_producto]
    );

    if (productos.length === 0) {
      return res.status(404).json({ mensaje: 'El premio seleccionado no existe.' });
    }

    const producto = productos[0];

    // B. Consultar los puntos actuales del socio
    const [usuarios] = await db.query(
      'SELECT id_usuario, puntos FROM usuarios WHERE id_usuario = ?',
      [id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const usuario = usuarios[0];

    // C. Verificar si cuenta con puntos suficientes
    if (usuario.puntos < producto.valor_puntos) {
      return res.status(400).json({
        mensaje: 'Puntos insuficientes. Tenés ${usuario.puntos} puntos y necesitás ${producto.valor_puntos} puntos para este canje.'
      });
    }

    // D. Descontar los puntos del saldo del alumno
    const nuevosPuntos = usuario.puntos - producto.valor_puntos;

    await db.query('UPDATE usuarios SET puntos = ? WHERE id_usuario = ?', [
      nuevosPuntos,
      id_usuario
    ]);

    return res.json({
      mensaje: '¡Premio canjeado con éxito! Canjeaste: "${producto.descripcion}".',
      puntos_restantes: nuevosPuntos
    });
  } catch (error) {
    console.error('Error al realizar canje:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al procesar el canje.' });
  }
};

// ==========================================
// 7. ASIGNAR O AJUSTAR PUNTOS A UN SOCIO (Solo Admin)
// ==========================================
const ajustarPuntosUsuario = async (req, res) => {
  try {
    const { id_usuario, puntos } = req.body;

    if (!id_usuario || puntos === undefined) {
      return res.status(400).json({ mensaje: 'Se requiere identificacion y el valor numerico de puntos.' });
    }

    const [resultado] = await db.query(
      'UPDATE usuarios SET puntos = ? WHERE id_usuario = ?',
      [puntos, id_usuario]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    return res.json({ mensaje: 'Puntos actualizados a ${puntos} para el usuario especificado.' });
  } catch (error) {
    console.error('Error al ajustar puntos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al ajustar puntos.' });
  }
};

module.exports = {
  obtenerProductosCanje,
  crearProductoCanje,
  actualizarProductoCanje,
  eliminarProductoCanje,
  consultarSaldoPuntos,
  realizarCanje,
  ajustarPuntosUsuario
};