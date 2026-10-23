const db = require('../config/db');
const { enviarMailCumpleanios } = require('../config/mailer');
const { leerConfigNumero } = require('../servicios/puntos');

const CADA_UNA_HORA = 60 * 60 * 1000;

// Condición SQL "hoy es el cumpleaños" para una columna de fecha de nacimiento.
// Los nacidos un 29 de febrero lo festejan el 28 en los años que no son bisiestos.
const esCumpleaniosSQL = (columna) => `(
  ${columna} IS NOT NULL AND (
    (MONTH(${columna}) = MONTH(CURDATE()) AND DAY(${columna}) = DAY(CURDATE()))
    OR (
      MONTH(${columna}) = 2 AND DAY(${columna}) = 29
      AND MONTH(CURDATE()) = 2 AND DAY(CURDATE()) = 28
      AND DAY(LAST_DAY(CURDATE())) = 28
    )
  )
)`;

// Regala los puntos y envía el correo a los alumnos que cumplen años hoy y que
// todavía no recibieron el regalo este año. Si se indica id_usuario, revisa solo a ese alumno.
// Se ejecuta al arrancar el servidor, una vez por hora, y además en el momento en que el alumno
// carga su fecha de nacimiento, entra a su panel o pasa por el molinete.
const revisarCumpleanios = async (id_usuario = null) => {
  const [alumnos] = await db.query(`
    SELECT u.id_usuario, u.nombre, u.mail
    FROM usuarios u
    WHERE u.id_rol = 3 AND u.activo = 1
      AND ${esCumpleaniosSQL('u.fecha_nacimiento')}
      ${id_usuario ? 'AND u.id_usuario = ?' : ''}
      AND NOT EXISTS (
        SELECT 1 FROM movimientos_puntos m
        WHERE m.id_usuario = u.id_usuario AND m.motivo = 'cumpleanios'
          AND YEAR(m.fecha) = YEAR(CURDATE())
      )
  `, id_usuario ? [id_usuario] : []);

  if (alumnos.length === 0) return 0;

  const puntos = await leerConfigNumero('puntos_cumpleanios', 200);
  let saludados = 0;

  for (const alumno of alumnos) {
    const conexion = await db.getConnection();
    try {
      await conexion.beginTransaction();

      // Se bloquea al usuario y se vuelve a controlar, para no regalar dos veces
      // si dos revisiones coinciden en el mismo momento
      await conexion.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ? FOR UPDATE', [alumno.id_usuario]);
      const [ya] = await conexion.query(`
        SELECT 1 FROM movimientos_puntos
        WHERE id_usuario = ? AND motivo = 'cumpleanios' AND YEAR(fecha) = YEAR(CURDATE())
      `, [alumno.id_usuario]);

      if (ya.length === 0) {
        await conexion.query('UPDATE usuarios SET puntos = puntos + ? WHERE id_usuario = ?', [puntos, alumno.id_usuario]);
        await conexion.query(`
          INSERT INTO movimientos_puntos (id_usuario, cantidad, motivo, descripcion)
          VALUES (?, ?, 'cumpleanios', '¡Feliz cumpleaños!')
        `, [alumno.id_usuario, puntos]);
      }

      await conexion.commit();

      if (ya.length === 0) {
        saludados++;
        // El correo se envía en segundo plano
        enviarMailCumpleanios({ destinatario: alumno.mail, nombre: alumno.nombre, puntos })
          .then(() => console.log(`🎂 Saludo de cumpleaños enviado a ${alumno.mail}`))
          .catch((error) => console.error(`No se pudo enviar el saludo de cumpleaños a ${alumno.mail}:`, error.message));
      }
    } catch (error) {
      await conexion.rollback();
      console.error('Error al registrar un cumpleaños:', error.message);
    } finally {
      conexion.release();
    }
  }

  if (saludados > 0) console.log(`🎂 Cumpleaños: ${saludados} alumno(s) saludado(s) con ${puntos} puntos.`);
  return saludados;
};

// Revisa al arrancar el servidor y después una vez por hora
const iniciarTareaCumpleanios = () => {
  const ejecutar = () => revisarCumpleanios().catch((error) => console.error('Error en la tarea de cumpleaños:', error.message));
  ejecutar();
  setInterval(ejecutar, CADA_UNA_HORA);
};

module.exports = { iniciarTareaCumpleanios, revisarCumpleanios, esCumpleaniosSQL };
