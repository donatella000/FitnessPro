const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { darBienvenida } = require('../servicios/puntos');
const { revisarCumpleanios } = require('../tareas/cumpleanios');
const { validarImagen } = require('../servicios/imagenes');

const ROL_ADMIN = 1;
const ROL_PROFESOR = 2;
const ROL_ALUMNO = 3;

// Columnas que se devuelven al consultar usuarios (nunca el hash ni el token)
const CAMPOS_USUARIO = `
  u.id_usuario, u.dni, u.nombre, u.apellido, u.mail,
  u.telefono, u.calle, u.numero, u.fecha_nacimiento, u.sexo,
  u.contacto_emergencia_nombre, u.contacto_emergencia_tel,
  u.puntos, u.id_rol, r.descripcion AS rol,
  u.debe_cambiar_password, u.activo, u.fecha_registro
`;

// ------------------------------------------
// Reglas de permisos
// ------------------------------------------
// Admin: gestiona a cualquier usuario.
// Profesor: gestiona alumnos y su propio perfil.
// Alumno: solo su propio perfil.
const puedeGestionar = (solicitante, objetivo) => {
  if (solicitante.id_rol === ROL_ADMIN) return true;
  if (solicitante.id_usuario === objetivo.id_usuario) return true;
  if (solicitante.id_rol === ROL_PROFESOR && objetivo.id_rol === ROL_ALUMNO) return true;
  return false;
};

const buscarUsuario = async (id) => {
  const [filas] = await db.query(
    'SELECT id_usuario, id_rol, activo FROM usuarios WHERE id_usuario = ?',
    [id]
  );
  return filas[0] || null;
};

// ==========================================
// 1. LISTAR USUARIOS (Admin y Profesor)
// ==========================================
// Filtros opcionales por query string:
//   ?rol=3              solo un rol
//   ?buscar=perez       busca en nombre, apellido, DNI o mail
//   ?incluirInactivos=1 incluye los dados de baja
// El profesor solo ve alumnos.
const obtenerUsuarios = async (req, res) => {
  try {
    const { rol, buscar, incluirInactivos } = req.query;
    const condiciones = [];
    const valores = [];

    if (req.usuario.id_rol === ROL_PROFESOR) {
      condiciones.push('u.id_rol = ?');
      valores.push(ROL_ALUMNO);
    } else if (rol) {
      condiciones.push('u.id_rol = ?');
      valores.push(Number(rol));
    }

    if (!incluirInactivos) {
      condiciones.push('u.activo = 1');
    }

    if (buscar) {
      condiciones.push('(u.nombre LIKE ? OR u.apellido LIKE ? OR u.mail LIKE ? OR CAST(u.dni AS CHAR) LIKE ?)');
      const patron = `%${buscar}%`;
      valores.push(patron, patron, patron, patron);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [usuarios] = await db.query(`
      SELECT ${CAMPOS_USUARIO}
      FROM usuarios u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      ${where}
      ORDER BY u.apellido ASC, u.nombre ASC
    `, valores);

    return res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener la lista de usuarios.' });
  }
};

// ==========================================
// 1 bis. RESUMEN: CANTIDAD DE USUARIOS POR ROL (Admin y Profesor)
// ==========================================
// GET /api/usuarios/resumen
// Devuelve, por rol, cuántos están activos y cuántos dados de baja.
// El profesor solo recibe el número de alumnos.
const obtenerResumenUsuarios = async (req, res) => {
  try {
    const [filas] = await db.query(`
      SELECT id_rol, SUM(activo = 1) AS activos, SUM(activo = 0) AS de_baja
      FROM usuarios
      GROUP BY id_rol
    `);

    const contar = (rol) => {
      const fila = filas.find((f) => f.id_rol === rol);
      return { activos: Number(fila?.activos || 0), de_baja: Number(fila?.de_baja || 0) };
    };

    const resumen = { alumnos: contar(ROL_ALUMNO) };
    if (req.usuario.id_rol === ROL_ADMIN) {
      resumen.profesores = contar(ROL_PROFESOR);
      resumen.administradores = contar(ROL_ADMIN);
    }

    return res.json(resumen);
  } catch (error) {
    console.error('Error al obtener el resumen de usuarios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el resumen.' });
  }
};

// ==========================================
// 2. OBTENER UN USUARIO POR ID
// ==========================================
// Incluye sus suscripciones vigentes (abono, vencimiento y turnos restantes).
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const objetivo = await buscarUsuario(id);

    if (!objetivo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (!puedeGestionar(req.usuario, objetivo)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: no tenés permiso para ver este perfil.' });
    }

    const [usuarios] = await db.query(`
      SELECT ${CAMPOS_USUARIO}, u.foto
      FROM usuarios u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = ?
    `, [id]);

    const [suscripciones] = await db.query(`
      SELECT
        sa.id_suscripcion_alumno,
        s.nombre AS suscripcion,
        a.nombre AS actividad,
        a.tipo AS tipo_actividad,
        s.veces_por_semana,
        sa.fecha_inicio,
        sa.fecha_fin,
        sa.turnos_totales,
        sa.turnos_usados,
        (sa.turnos_totales - sa.turnos_usados) AS turnos_restantes
      FROM suscripciones_alumno sa
      INNER JOIN suscripciones s ON sa.id_suscripcion = s.id_suscripcion
      INNER JOIN actividades a ON s.id_actividad = a.id_actividad
      WHERE sa.id_usuario = ?
        AND sa.fecha_fin >= CURDATE()
        AND sa.turnos_usados < sa.turnos_totales
      ORDER BY sa.fecha_fin ASC
    `, [id]);

    return res.json({ ...usuarios[0], suscripciones_activas: suscripciones });
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener el usuario.' });
  }
};

// ==========================================
// 3. CREAR USUARIO DESDE EL PANEL (Admin y Profesor)
// ==========================================
// Solo se piden DNI, nombre, apellido y mail. La contraseña inicial es el DNI
// y el usuario queda obligado a cambiarla en su primer ingreso.
// El profesor solo puede crear alumnos. El admin puede crear cualquier rol.
const crearUsuario = async (req, res) => {
  const { dni, nombre, apellido, mail, id_rol } = req.body;

  try {
    if (!dni || !nombre || !apellido || !mail) {
      return res.status(400).json({
        mensaje: 'Los campos DNI, nombre, apellido y correo electrónico son obligatorios.'
      });
    }

    if (!/^\d{6,10}$/.test(String(dni))) {
      return res.status(400).json({ mensaje: 'El DNI debe tener solo números, sin puntos.' });
    }

    let rolNuevo = ROL_ALUMNO;
    if (req.usuario.id_rol === ROL_ADMIN && id_rol) {
      rolNuevo = Number(id_rol);
    }

    const [existente] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE mail = ? OR dni = ?',
      [mail, dni]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        mensaje: 'El DNI o el correo electrónico ya están registrados en el sistema.'
      });
    }

    const claveHasheada = await bcrypt.hash(String(dni), 10);

    const [resultado] = await db.query(`
      INSERT INTO usuarios (dni, nombre, apellido, mail, password_hash, id_rol, debe_cambiar_password)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [dni, nombre.trim(), apellido.trim(), mail.trim().toLowerCase(), claveHasheada, rolNuevo]);

    // A los alumnos nuevos se les regalan puntos y se les envía el correo de bienvenida
    if (rolNuevo === ROL_ALUMNO) {
      await darBienvenida({
        id_usuario: resultado.insertId,
        nombre: nombre.trim(),
        mail: mail.trim().toLowerCase(),
        altaPorStaff: true
      });
    }

    return res.status(201).json({
      mensaje: rolNuevo === ROL_ALUMNO
        ? 'Alumno creado. Le enviamos un correo de bienvenida; su contraseña inicial es su DNI.'
        : 'Usuario creado. Su contraseña inicial es su DNI y deberá cambiarla al ingresar.',
      id_usuario: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el usuario.' });
  }
};

// ==========================================
// 4. ACTUALIZAR DATOS DE USUARIO
// ==========================================
// Solo se modifican los campos que vienen en la petición.
// - Datos personales: cualquiera sobre su propio perfil, o admin/profe según permisos.
// - DNI: solo admin y profesor (es lo que se usa en el molinete).
// - Rol: solo admin.
// Los puntos se modifican desde el módulo de puntos, para que quede registro del movimiento.
const actualizarUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const objetivo = await buscarUsuario(id);

    if (!objetivo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (!puedeGestionar(req.usuario, objetivo)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: no tenés permiso para modificar este usuario.' });
    }

    const camposPermitidos = [
      'nombre', 'apellido', 'mail', 'telefono', 'calle', 'numero',
      'fecha_nacimiento', 'sexo', 'contacto_emergencia_nombre', 'contacto_emergencia_tel'
    ];

    if (req.usuario.id_rol === ROL_ADMIN || req.usuario.id_rol === ROL_PROFESOR) {
      camposPermitidos.push('dni');
    }

    // El admin no puede cambiarse el rol a sí mismo, para no quedarse sin acceso
    if (req.usuario.id_rol === ROL_ADMIN && req.usuario.id_usuario !== id) {
      camposPermitidos.push('id_rol');
    }

    const sets = [];
    const valores = [];

    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        sets.push(`${campo} = ?`);
        // Un texto vacío se guarda como NULL (permite borrar un dato opcional)
        valores.push(req.body[campo] === '' ? null : req.body[campo]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron datos para actualizar.' });
    }

    // Campos obligatorios que no pueden quedar vacíos
    for (const campo of ['nombre', 'apellido', 'mail', 'dni']) {
      if (req.body[campo] === '' || req.body[campo] === null) {
        return res.status(400).json({ mensaje: `El campo ${campo} no puede quedar vacío.` });
      }
    }

    // Evitar DNI o mail duplicados
    if (req.body.mail || req.body.dni) {
      const [duplicado] = await db.query(
        'SELECT id_usuario FROM usuarios WHERE (mail = ? OR dni = ?) AND id_usuario <> ?',
        [req.body.mail || '', req.body.dni || 0, id]
      );
      if (duplicado.length > 0) {
        return res.status(400).json({ mensaje: 'El DNI o el correo electrónico ya pertenecen a otro usuario.' });
      }
    }

    valores.push(id);
    await db.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = ?`, valores);

    // Si se cargó la fecha de nacimiento y hoy es el cumpleaños, se saluda en el momento
    if (req.body.fecha_nacimiento) {
      revisarCumpleanios(id).catch((error) => console.error('Error al revisar el cumpleaños:', error.message));
    }

    return res.json({ mensaje: '¡Usuario actualizado exitosamente!' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar los datos del usuario.' });
  }
};

// ==========================================
// 5. DAR DE BAJA USUARIO (Admin y Profesor)
// ==========================================
// No se borra de la base: se marca como inactivo para conservar
// su historial de pagos, turnos y asistencias.
const eliminarUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const objetivo = await buscarUsuario(id);

    if (!objetivo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (req.usuario.id_usuario === id) {
      return res.status(400).json({ mensaje: 'No podés darte de baja a vos mismo.' });
    }

    if (!puedeGestionar(req.usuario, objetivo)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: no tenés permiso para dar de baja a este usuario.' });
    }

    await db.query('UPDATE usuarios SET activo = 0 WHERE id_usuario = ?', [id]);

    return res.json({ mensaje: 'Usuario dado de baja correctamente.' });
  } catch (error) {
    console.error('Error al dar de baja usuario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al dar de baja el usuario.' });
  }
};

// ==========================================
// 6. REACTIVAR USUARIO (Admin y Profesor)
// ==========================================
const reactivarUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const objetivo = await buscarUsuario(id);

    if (!objetivo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (!puedeGestionar(req.usuario, objetivo)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: no tenés permiso para reactivar a este usuario.' });
    }

    await db.query('UPDATE usuarios SET activo = 1 WHERE id_usuario = ?', [id]);

    return res.json({ mensaje: 'Usuario reactivado correctamente.' });
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al reactivar el usuario.' });
  }
};

// ==========================================
// 7. FOTO DE PERFIL
// ==========================================
// PUT /api/usuarios/:id/foto   Body: { foto: 'data:image/jpeg;base64,...' }
// Cada usuario cambia la suya; el admin y el profesor, según los permisos de siempre.
const actualizarFoto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const objetivo = await buscarUsuario(id);
    if (!objetivo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if (!puedeGestionar(req.usuario, objetivo)) {
      return res.status(403).json({ mensaje: 'No tenés permiso para cambiar esta foto.' });
    }

    const error = validarImagen(req.body.foto, 600);
    if (error) {
      return res.status(400).json({ mensaje: error });
    }

    await db.query('UPDATE usuarios SET foto = ? WHERE id_usuario = ?', [req.body.foto, id]);
    return res.json({ mensaje: 'Foto de perfil actualizada.' });
  } catch (error) {
    console.error('Error al actualizar la foto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al guardar la foto.' });
  }
};

// DELETE /api/usuarios/:id/foto
const eliminarFoto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const objetivo = await buscarUsuario(id);
    if (!objetivo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if (!puedeGestionar(req.usuario, objetivo)) {
      return res.status(403).json({ mensaje: 'No tenés permiso para quitar esta foto.' });
    }

    await db.query('UPDATE usuarios SET foto = NULL WHERE id_usuario = ?', [id]);
    return res.json({ mensaje: 'Foto de perfil eliminada.' });
  } catch (error) {
    console.error('Error al eliminar la foto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al quitar la foto.' });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerResumenUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  reactivarUsuario,
  actualizarFoto,
  eliminarFoto
};
