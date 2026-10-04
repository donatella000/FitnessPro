const nodemailer = require('nodemailer');

// Transportador de Gmail, reutilizable en toda la app
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarMailRecuperacion(destinatario, token) {
  const link = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`;

  await transporter.sendMail({
    from: `"FitnessPro" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Recuperá tu contraseña - FitnessPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña en FitnessPro.</p>
        <p>Hacé clic en el siguiente botón para elegir una nueva contraseña. Este link expira en 1 hora.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background:#1dd75b; color:#000; padding:12px 24px; border-radius:24px; text-decoration:none; font-weight:bold;">
            Restablecer contraseña
          </a>
        </p>
        <p>Si vos no pediste esto, podés ignorar este mail; tu contraseña no va a cambiar.</p>
      </div>
    `,
  });
}

module.exports = { enviarMailRecuperacion };