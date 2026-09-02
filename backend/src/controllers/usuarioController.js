const db = require('../config/db');

// ==========================================
// 1. OBTENER TODOS LOS USUARIOS (Admin y Profesor)
// ==========================================
const obtenerUsuarios = async (req, res) => {
  try {
    const [usuarios] = await db.query(`
      SELECT 
        u.id_usuario, 
        u.dni, 
        u.nombre, 
        u.apellido, 
        u.mail, 
        u.caracteristica_cel, 
        u.celular, 
        u.calle, 
        u.numero,
        u.fecha_registro, 
        u.caracteristica, 
        u.contacto_emergencia, 
        u.puntos, 
        u.id_rol,
        r.descripcion AS rol, 
        u.id_suscripcion, 
        s.descripcion AS suscripcion
      FROM usuarios u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN suscripcion s ON u.id_suscripcion = s.id_suscripcion
      ORDER BY u.apellido ASC, u.nombre ASC
    `);

    return res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la lista de usuarios.' });
  }
};

// ==========================================
// 2. OBTENER UN USUARIO POR SU ID (Admin, Profesor o el propio Alumno)
// ==========================================
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario, id_rol } = req.usuario;

    // Regla de seguridad: Si es alumno (rol 3), solo puede consultar su propio perfil
    if (id_rol === 3 && parseInt(id) !== id_usuario) {
      return res.status(403).json({ mensaje: 'Acceso denegado: Solo podés consultar tu propio perfil.' });
    }

    const [usuarios] = await db.query(`
      SELECT 
        u.id_usuario, 
        u.dni, 
        u.nombre, 
        u.apellido, 
        u.mail, 
        u.caracteristica_cel, 
        u.celular, 
        u.calle, 
        u.numero,
        u.fecha_registro, 
        u.caracteristica, 
        u.contacto_emergencia, 
        u.puntos, 
        u.id_rol, 
        r.descripcion AS rol, 
        u.id_suscripcion, 
        s.descripcion AS suscripcion
      FROM usuarios u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN suscripcion s ON u.id_suscripcion = s.id_suscripcion
      WHERE u.id_usuario = ?
    `, [id]);

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    return res.json(usuarios[0]);
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el usuario.' });
  }
};

// ==========================================
// 3. ACTUALIZAR DATOS DE USUARIO
// ==========================================
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario, id_rol } = req.usuario;

    // Si es alumno, únicamente puede editar sus propios datos
    if (id_rol === 3 && parseInt(id) !== id_usuario) {
      return res.status(403).json({ mensaje: 'Acceso denegado: Solo podés modificar tu propia información.' });
    }

    const {
      nombre,
      apellido,
      caracteristica_cel,
      celular,
      calle,
      numero,
      caracteristica,
      contacto_emergencia,
      id_rol: nuevo_id_rol,
      id_suscripcion,
      puntos
    } = req.body;

    // Un alumno no puede cambiarse su propio rol, ni sus puntos ni su suscripción directamente desde aquí
    const rolActualizar = (id_rol === 1) ? nuevo_id_rol : undefined;
    const puntosActualizar = (id_rol === 1) ? puntos : undefined;
    const suscripcionActualizar = (id_rol === 1 || id_rol === 2) ? id_suscripcion : undefined;

    const [resultado] = await db.query(`
      UPDATE usuarios SET
        nombre = COALESCE(?, nombre),
        apellido = COALESCE(?, apellido),
        caracteristica_cel = COALESCE(?, caracteristica_cel),
        celular = COALESCE(?, celular),
        calle = COALESCE(?, calle),
        numero = COALESCE(?, numero),
        caracteristica = COALESCE(?, caracteristica),
        contacto_emergencia = COALESCE(?, contacto_emergencia),
        id_rol = COALESCE(?, id_rol),
        id_suscripcion = COALESCE(?, id_suscripcion),
        puntos = COALESCE(?, puntos)
      WHERE id_usuario = ?
    `, [
      nombre,
      apellido,
      caracteristica_cel,
      celular,
      calle,
      numero,
      caracteristica,
      contacto_emergencia,
      rolActualizar,
      suscripcionActualizar,
      puntosActualizar,
      id
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado para actualizar.' });
    }

    return res.json({ mensaje: '¡Usuario actualizado exitosamente!' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar los datos del usuario.' });
  }
};

// ==========================================
// 4. ELIMINAR USUARIO (Admin y Profesor con jerarquía)
// ==========================================
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_rol } = req.usuario;

    // Verificar el rol del usuario a eliminar
    const [target] = await db.query('SELECT id_rol FROM usuarios WHERE id_usuario = ?', [id]);

    if (target.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // Regla de jerarquía: Un profesor (rol 2) no puede eliminar a un administrador (rol 1)
    if (id_rol === 2 && target[0].id_rol === 1) {
      return res.status(403).json({
        mensaje: 'Acceso denegado: Un profesor no tiene permisos para eliminar a un administrador.'
      });
    }

    // Un profesor tampoco puede eliminarse a sí mismo ni a otro profesor
    if (id_rol === 2 && target[0].id_rol === 2) {
      return res.status(403).json({
        mensaje: 'Acceso denegado: Un profesor no tiene permisos para eliminar a otro profesor.'
      });
    }

    const [resultado] = await db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    return res.json({ mensaje: '¡Usuario eliminado exitosamente!' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({
      mensaje: 'No se puede eliminar el usuario porque tiene registros asociados (turnos, rutinas o pagos).'
    });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario
};