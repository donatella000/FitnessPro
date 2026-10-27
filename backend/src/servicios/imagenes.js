// Validación de imágenes que llegan desde la página en formato data URL
// (por ejemplo: "data:image/png;base64,iVBORw0...").
// La página ya las achica antes de enviarlas, así que el límite es holgado.

const FORMATOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

// Devuelve un mensaje de error, o null si la imagen es válida
const validarImagen = (dataUrl, maxKB = 800) => {
  if (typeof dataUrl !== 'string') return 'La imagen no es válida.';

  const coincidencia = dataUrl.match(/^data:([a-z+/]+);base64,/);
  if (!coincidencia || !FORMATOS.includes(coincidencia[1])) {
    return 'La imagen tiene que ser PNG, JPG, WEBP o SVG.';
  }

  // El texto en base64 ocupa un tercio más que la imagen
  const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
  if (kb > maxKB) {
    return `La imagen es demasiado grande (${kb} KB). El máximo es ${maxKB} KB.`;
  }

  return null;
};

module.exports = { validarImagen };
