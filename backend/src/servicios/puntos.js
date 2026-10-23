const db = require('../config/db');
const { enviarMailBienvenida } = require('../config/mailer');

// Lee un valor numérico de la tabla configuracion
const leerConfigNumero = async (clave, porDefecto) => {
  const [filas] = await db.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return filas.length ? Number(filas[0].valor) : porDefecto;
};

// Suma puntos a un alumno y deja registrado el movimiento.
// Recibe una conexión si se usa dentro de una transacción.
const sumarPuntos = async ({ conexion = db, id_usuario, cantidad, motivo, descripcion, registrado_por = null }) => {
  if (!cantidad) return;
  await conexion.query('UPDATE usuarios SET puntos = puntos + ? WHERE id_usuario = ?', [cantidad, id_usuario]);
  await conexion.query(`
    INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion, registrado_por)
    VALUES (?, ?, ?, ?, ?)
  `, [id_usuario, cantidad, motivo, descripcion, registrado_por]);
};

// Regalo de bienvenida para un alumno nuevo: suma los puntos y envía el correo.
// Si el correo falla (por ejemplo, sin conexión), el alta igual queda hecha.
const darBienvenida = async ({ id_usuario, nombre, mail, altaPorStaff }) => {
  const puntos = await leerConfigNumero('puntos_bienvenida', 500);

  try {
    await sumarPuntos({ id_usuario, cantidad: puntos, motivo: 'bienvenida', descripcion: 'Regalo de bienvenida' });
  } catch (error) {
    console.error('No se pudieron sumar los puntos de bienvenida:', error.message);
  }

  // El correo se envía en segundo plano, para no demorar la respuesta del registro
  enviarMailBienvenida({ destinatario: mail, nombre, puntos, altaPorStaff })
    .catch((error) => console.error('No se pudo enviar el correo de bienvenida:', error.message));

  return puntos;
};

module.exports = { leerConfigNumero, sumarPuntos, darBienvenida };
