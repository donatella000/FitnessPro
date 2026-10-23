const db = require('../config/db');
const { enviarMailCumpleanios } = require('../config/mailer');
const { leerConfigNumero } = require('../servicios/puntos');

const CADA_UNA_HORA = 60 * 60 * 1000;

// Busca los alumnos que cumplen años hoy y que todavía no recibieron el regalo este año.
// Los nacidos un 29 de febrero lo festejan el 28 en los años que no son bisiestos.
const revisarCumpleanios = async () => {
  const [alumnos] = await db.query(`
    SELECT u.id_usuario, u.nombre, u.mail
    FROM usuarios u
    WHERE u.id_rol = 3 AND u.activo = 1 AND u.fecha_nacimiento IS NOT NULL
      AND (
        (MONTH(u.fecha_nacimiento) = MONTH(CURDATE()) AND DAY(u.fecha_nacimiento) = DAY(CURDATE()))
        OR (
          MONTH(u.fecha_nacimiento) = 2 AND DAY(u.fecha_nacimiento) = 29
          AND MONTH(CURDATE()) = 2 AND DAY(CURDATE()) = 28
          AND DAY(LAST_DAY(CURDATE())) = 28
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM movimientos_puntos m
        WHERE m.id_usuario = u.id_usuario AND m.motivo = 'cumpleanios'
          AND YEAR(m.fecha) = YEAR(CURDATE())
      )
  `);

  if (alumnos.length === 0) return 0;

  const puntos = await leerConfigNumero('puntos_cumpleanios', 200);

  for (const alumno of alumnos) {
    const conexion = await db.getConnection();
    try {
      await conexion.beginTransaction();

      // Se vuelve a controlar dentro de la transacción para no regalar dos veces
      const [ya] = await conexion.query(`
        SELECT 1 FROM movimientos_puntos
        WHERE id_usuario = ? AND motivo = 'cumpleanios' AND YEAR(fecha) = YEAR(CURDATE())
        FOR UPDATE
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
        enviarMailCumpleanios({ destinatario: alumno.mail, nombre: alumno.nombre, puntos })
          .catch((error) => console.error(`No se pudo enviar el saludo de cumpleaños a ${alumno.mail}:`, error.message));
      }
    } catch (error) {
      await conexion.rollback();
      console.error('Error al registrar un cumpleaños:', error.message);
    } finally {
      conexion.release();
    }
  }

  console.log(`🎂 Cumpleaños revisados: ${alumnos.length} alumno(s) saludado(s).`);
  return alumnos.length;
};

// Revisa al arrancar el servidor y después una vez por hora.
// Así, aunque el servidor se apague a la noche, los saludos salen apenas se prende.
const iniciarTareaCumpleanios = () => {
  const ejecutar = () => revisarCumpleanios().catch((error) => console.error('Error en la tarea de cumpleaños:', error.message));
  ejecutar();
  setInterval(ejecutar, CADA_UNA_HORA);
};

module.exports = { iniciarTareaCumpleanios, revisarCumpleanios };
