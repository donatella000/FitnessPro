const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { enviarMailRecuperacion } = require('../config/mailer');
const { darBienvenida } = require('../servicios/puntos');

const LARGO_MINIMO_CLAVE = 6;
const ROL_ALUMNO = 3;

// ==========================================
// 1. AUTOREGISTRO DE ALUMNOS
// ==========================================
// El rol siempre es Alumno (3). Los profesores y administradores
// se crean desde el dashboard, nunca desde el registro público.
const registrar = async (req, res) => {
  const {
    dni,
    nombre,
    apellido,
    clave,
    mail,
    telefono,
    calle,
    numero,
    fecha_nacimiento,
    sexo,
    contacto_emergencia_nombre,
    contacto_emergencia_tel
  } = req.body;

  try {
    if (!dni || !nombre || !apellido || !clave || !mail) {
      return res.status(400).json({
        mensaje: 'Los campos DNI, nombre, apellido, correo electrónico y clave son obligatorios.'
      });
    }

    if (clave.length < LARGO_MINIMO_CLAVE) {
      return res.status(400).json({
        mensaje: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`
      });
    }

    const [usuarioExistente] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE mail = ? OR dni = ?',
      [mail, dni]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        mensaje: 'El DNI o el correo electrónico ya están registrados en el sistema.'
      });
    }

    const claveHasheada = await bcrypt.hash(clave, 10);

    // Los campos opcionales se guardan como NULL si no vienen.
    // fecha_registro y puntos toman su valor por defecto desde la base.
    const [resultado] = await db.query(`
      INSERT INTO usuarios (
        dni, nombre, apellido, mail, password_hash, id_rol,
        telefono, calle, numero, fecha_nacimiento, sexo,
        contacto_emergencia_nombre, contacto_emergencia_tel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dni,
      nombre,
      apellido,
      mail,
      claveHasheada,
      ROL_ALUMNO,
      telefono || null,
      calle || null,
      numero || null,
      fecha_nacimiento || null,
      sexo || null,
      contacto_emergencia_nombre || null,
      contacto_emergencia_tel || null
    ]);

    // Regalo de puntos y correo de bienvenida (si el correo falla, el registro igual queda hecho)
    const puntos = await darBienvenida({
      id_usuario: resultado.insertId,
      nombre,
      mail,
      altaPorStaff: false
    });

    return res.status(201).json({
      mensaje: '¡Usuario registrado exitosamente!',
      id_usuario: resultado.insertId,
      puntos_regalo: puntos
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor al registrar el usuario.'
    });
  }
};

// ==========================================
// 2. INICIO DE SESIÓN (LOGIN)
// ==========================================
const login = async (req, res) => {
  const { mail, clave } = req.body;

  try {
    if (!mail || !clave) {
      return res.status(400).json({
        mensaje: 'Debe ingresar el correo electrónico y la contraseña.'
      });
    }

    const [usuarios] = await db.query(`
      SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.mail,
        u.password_hash,
        u.id_rol,
        u.debe_cambiar_password,
        u.activo,
        u.foto,
        r.descripcion AS rol_nombre
      FROM usuarios u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.mail = ?
    `, [mail]);

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'Correo electrónico o contraseña incorrectos.'
      });
    }

    const usuario = usuarios[0];

    const passwordValido = await bcrypt.compare(clave, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({
        mensaje: 'Correo electrónico o contraseña incorrectos.'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        mensaje: 'Tu usuario está dado de baja. Comunicate con el gimnasio.'
      });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        id_rol: usuario.id_rol,
        rol_nombre: usuario.rol_nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      mensaje: '¡Inicio de sesión exitoso!',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mail: usuario.mail,
        id_rol: usuario.id_rol,
        rol: usuario.rol_nombre,
        // Si es true, el frontend tiene que llevarlo a la pantalla de cambio de contraseña
        debe_cambiar_password: Boolean(usuario.debe_cambiar_password),
        foto: usuario.foto || null
      }
    });
  } catch (error) {
    console.error('Error interno en login:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor al procesar el inicio de sesión.'
    });
  }
};

// ==========================================
// 3. SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// ==========================================
const solicitarRecuperacion = async (req, res) => {
  const { mail } = req.body;
  const respuestaGenerica = {
    mensaje: 'Si el correo existe en nuestro sistema, vas a recibir un mail con instrucciones.'
  };

  try {
    if (!mail) {
      return res.status(400).json({ mensaje: 'Debe ingresar su correo electrónico.' });
    }

    const [usuarios] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE mail = ? AND activo = 1',
      [mail]
    );

    // Por seguridad, se responde lo mismo exista o no el mail
    if (usuarios.length === 0) {
      return res.json(respuestaGenerica);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.query(
      'UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE id_usuario = ?',
      [token, expira, usuarios[0].id_usuario]
    );

    await enviarMailRecuperacion(mail, token);

    return res.json(respuestaGenerica);
  } catch (error) {
    console.error('Error al solicitar recuperación:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ==========================================
// 4. RESTABLECER CONTRASEÑA CON TOKEN DEL MAIL
// ==========================================
const restablecerPassword = async (req, res) => {
  const { token, nuevaClave } = req.body;

  try {
    if (!token || !nuevaClave) {
      return res.status(400).json({ mensaje: 'Faltan datos para restablecer la contraseña.' });
    }

    if (nuevaClave.length < LARGO_MINIMO_CLAVE) {
      return res.status(400).json({
        mensaje: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`
      });
    }

    const [usuarios] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE reset_token = ? AND reset_token_expira > NOW()',
      [token]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({ mensaje: 'El link es inválido o ya expiró. Solicitá uno nuevo.' });
    }

    const claveHasheada = await bcrypt.hash(nuevaClave, 10);

    await db.query(`
      UPDATE usuarios
      SET password_hash = ?,
          reset_token = NULL,
          reset_token_expira = NULL,
          debe_cambiar_password = 0
      WHERE id_usuario = ?
    `, [claveHasheada, usuarios[0].id_usuario]);

    return res.json({ mensaje: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ==========================================
// 5. CAMBIAR CONTRASEÑA ESTANDO LOGUEADO
// ==========================================
// Se usa en el primer ingreso de un alumno dado de alta por el admin/profe
// (contraseña = DNI) y cuando cualquier usuario quiera cambiarla desde su perfil.
const cambiarPassword = async (req, res) => {
  const { claveActual, nuevaClave } = req.body;
  const { id_usuario } = req.usuario; // viene del token (verificarToken)

  try {
    if (!claveActual || !nuevaClave) {
      return res.status(400).json({ mensaje: 'Debe ingresar la contraseña actual y la nueva.' });
    }

    if (nuevaClave.length < LARGO_MINIMO_CLAVE) {
      return res.status(400).json({
        mensaje: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`
      });
    }

    if (claveActual === nuevaClave) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe ser distinta de la actual.' });
    }

    const [usuarios] = await db.query(
      'SELECT password_hash FROM usuarios WHERE id_usuario = ?',
      [id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const passwordValido = await bcrypt.compare(claveActual, usuarios[0].password_hash);
    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta.' });
    }

    const claveHasheada = await bcrypt.hash(nuevaClave, 10);

    await db.query(
      'UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 0 WHERE id_usuario = ?',
      [claveHasheada, id_usuario]
    );

    return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

module.exports = {
  registrar,
  login,
  solicitarRecuperacion,
  restablecerPassword,
  cambiarPassword
};
