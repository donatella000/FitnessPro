const nodemailer = require('nodemailer');
// dotenv ya se carga en server.js

// Transportador de Gmail, reutilizable en toda la app
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Plantilla común de los correos, con los colores de FitnessPro
function plantilla(titulo, contenido) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #01200e; color: #ffffff; border-radius: 16px; overflow: hidden;">
      <div style="padding: 24px 28px; background: #001208; color: #0dff4a; font-size: 20px; font-weight: bold; letter-spacing: 1px;">
        FITNESSPRO
      </div>
      <div style="padding: 28px;">
        <h2 style="margin: 0 0 16px; color: #0dff4a;">${titulo}</h2>
        ${contenido}
        <p style="margin: 28px 0 0; color: #9fb8a8; font-size: 13px;">Empezá a entrenar distinto, empezá con FitnessPro.</p>
      </div>
    </div>
  `;
}

const boton = (texto, url) => `
  <p style="text-align: center; margin: 28px 0;">
    <a href="${url}" style="background: #0dff4a; color: #03170a; padding: 12px 26px; border-radius: 24px; text-decoration: none; font-weight: bold;">${texto}</a>
  </p>
`;

async function enviarMailRecuperacion(destinatario, token) {
  const link = `${FRONTEND_URL}/restablecer-password?token=${token}`;

  await transporter.sendMail({
    from: `"FitnessPro" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Recuperá tu contraseña - FitnessPro',
    html: plantilla('Recuperación de contraseña', `
      <p>Recibimos una solicitud para restablecer tu contraseña en FitnessPro.</p>
      <p>Hacé clic en el botón para elegir una nueva contraseña. Este link expira en 1 hora.</p>
      ${boton('Restablecer contraseña', link)}
      <p>Si vos no pediste esto, podés ignorar este mail; tu contraseña no va a cambiar.</p>
    `),
  });
}

// Bienvenida a un alumno nuevo.
// altaPorStaff = true cuando lo registró el admin o un profesor (su contraseña inicial es el DNI).
async function enviarMailBienvenida({ destinatario, nombre, puntos, altaPorStaff }) {
  const regalo = puntos > 0
    ? `<p style="font-size: 17px;">Como regalo de bienvenida, ya tenés <strong style="color: #0dff4a;">${puntos} puntos</strong> en tu cuenta para canjear por premios.</p>`
    : '';

  const pasos = altaPorStaff
    ? `
      <p>Para empezar:</p>
      <ol style="padding-left: 20px; line-height: 1.7;">
        <li>Ingresá con tu correo y tu DNI como contraseña inicial.</li>
        <li>El sistema te va a pedir que cambies la contraseña por una de tu elección.</li>
        <li>Completá tus datos personales en la sección <strong>Perfil</strong>.</li>
      </ol>
    `
    : `
      <p>Para terminar de configurar tu cuenta, completá tus datos personales en la sección <strong>Perfil</strong>.
      Si en algún momento querés cambiar tu contraseña, lo podés hacer desde el menú de tu cuenta.</p>
    `;

  await transporter.sendMail({
    from: `"FitnessPro" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: '¡Bienvenido/a a FitnessPro!',
    html: plantilla(`¡Hola, ${nombre}! Bienvenido/a a FitnessPro`, `
      <p>Nos alegra que te sumes. Desde tu cuenta vas a poder elegir tu abono, reservar turnos, ver tu rutina y sumar puntos con cada asistencia.</p>
      ${regalo}
      ${pasos}
      ${boton('Ir a FitnessPro', FRONTEND_URL)}
    `),
  });
}

// Saludo de cumpleaños
async function enviarMailCumpleanios({ destinatario, nombre, puntos }) {
  const regalo = puntos > 0
    ? `<p style="font-size: 17px;">Para festejarlo, te regalamos <strong style="color: #0dff4a;">${puntos} puntos</strong> que ya están en tu cuenta.</p>`
    : '';

  await transporter.sendMail({
    from: `"FitnessPro" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `¡Feliz cumpleaños, ${nombre}!`,
    html: plantilla(`¡Feliz cumpleaños, ${nombre}!`, `
      <p>Todo el equipo de FitnessPro te desea un muy feliz cumpleaños.</p>
      ${regalo}
      ${boton('Ver mis puntos', `${FRONTEND_URL}/dashboard?vista=alumno&seccion=puntos`)}
    `),
  });
}

module.exports = { enviarMailRecuperacion, enviarMailBienvenida, enviarMailCumpleanios };
