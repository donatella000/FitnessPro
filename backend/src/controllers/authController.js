const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. REGISTRO DE USUARIOS
// ==========================================
const registrar = async (req, res) => {
  const {
    dni,
    nombre,
    apellido,
    clave,
    id_rol,
    mail,
    caracteristica_cel,
    celular,
    calle,
    numero,
    fecha_nacimiento,
    sexo,
    caracteristica,
    contacto_emergencia,
    id_suscripcion
  } = req.body;

  try {
    // Validar campos obligatorios básicos
    if (!dni || !nombre || !apellido || !clave || !mail) {
      return res.status(400).json({
        mensaje: 'Los campos DNI, nombre, apellido, correo electrónico y clave son obligatorios.'
      });
    }

    // Verificar si el correo o el DNI ya se encuentran registrados
    const [usuarioExistente] = await db.query(
      'SELECT id_usuario FROM usuarios WHERE mail = ? OR dni = ?',
      [mail, dni]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        mensaje: 'El DNI o el correo electrónico ya están registrados en el sistema.'
      });
    }

    // Hashear la contraseña antes de persistir
    const salt = await bcrypt.genSalt(10);
    const claveHasheada = await bcrypt.hash(clave, salt);
    const fecha_registro = new Date();

    // Inserción en la tabla usuarios incorporando fecha_nacimiento y sexo
    const [resultado] = await db.query(`
      INSERT INTO usuarios (
        dni,
        nombre,
        apellido,
        password_hash,
        id_rol,
        mail,
        caracteristica_cel,
        celular,
        calle,
        numero,
        fecha_nacimiento,
        sexo,
        fecha_registro,
        caracteristica,
        contacto_emergencia,
        puntos,
        id_suscripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      dni,
      nombre,
      apellido,
      claveHasheada,
      id_rol || 3,
      mail,
      caracteristica_cel || 0,
      celular || 0,
      calle || '',
      numero || 0,
      fecha_nacimiento || null,
      sexo || null,
      fecha_registro,
      caracteristica || 0,
      contacto_emergencia || 0,
      id_suscripcion || null
    ]);

    return res.status(201).json({
      mensaje: '¡Usuario registrado exitosamente!',
      id_usuario: resultado.insertId
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

  console.log('\n--- 🔍 INTENTO DE LOGIN ---');
  console.log('1. Mail recibido:', mail);
  console.log('2. Clave recibida:', clave);

  try {
    if (!mail || !clave) {
      console.log('❌ Error: Falta mail o clave en la petición');
      return res.status(400).json({
        mensaje: 'Debe ingresar el correo electrónico y la contraseña.'
      });
    }

    // Buscar al usuario y obtener la descripción de su rol
    const [usuarios] = await db.query(`
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.mail,
        u.password_hash,
        u.id_rol,
        r.descripcion AS rol_nombre
      FROM usuarios u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.mail = ?
    `, [mail]);

    console.log('3. Usuarios encontrados en BD:', usuarios.length);

    if (usuarios.length === 0) {
      console.log('❌ Motivo de fallo: No se encontró ningún usuario con ese mail o falló el JOIN con la tabla rol.');
      return res.status(401).json({
        mensaje: 'Correo electrónico o contraseña incorrectos.'
      });
    }

    const usuario = usuarios[0];
    console.log('4. Usuario encontrado:', usuario.mail, '| Rol:', usuario.rol_nombre, `(ID: ${usuario.id_rol})`);
    console.log('5. Hash guardado en BD:', usuario.password_hash);

    // Comparar la contraseña provista con el hash en MySQL
    const passwordValido = await bcrypt.compare(clave, usuario.password_hash);
    console.log('6. ¿Coincide la contraseña según bcrypt?:', passwordValido);

    if (!passwordValido) {
      console.log('❌ Motivo de fallo: La contraseña ingresada no coincide con el hash guardado.');
      return res.status(401).json({
        mensaje: 'Correo electrónico o contraseña incorrectos.'
      });
    }

    // Generar el token JWT con los datos de sesión del usuario
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        id_rol: usuario.id_rol,
        rol_nombre: usuario.rol_nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log('✅ ¡Login exitoso! Token emitido.');

    return res.json({
      mensaje: '¡Inicio de sesión exitoso!',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mail: usuario.mail,
        id_rol: usuario.id_rol,
        rol: usuario.rol_nombre
      }
    });
  } catch (error) {
    console.error('❌ Error interno en login:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor al procesar el inicio de sesión.'
    });
  }
};

module.exports = {
  registrar,
  login
};