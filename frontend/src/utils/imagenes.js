// Funciones para preparar imágenes en el navegador antes de enviarlas al backend.
// Las imágenes se achican acá, así se guardan livianas en la base de datos.

// Lee un archivo elegido por el usuario y lo devuelve como data URL
export function leerArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(archivo);
  });
}

function cargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error('El archivo elegido no es una imagen válida.'));
    img.src = src;
  });
}

// Recorta el centro en cuadrado y lo achica (para fotos de perfil).
// "origen" puede ser un data URL o un elemento <video> o <canvas>.
export async function fotoCuadrada(origen, lado = 320) {
  const fuente = typeof origen === 'string' ? await cargarImagen(origen) : origen;
  const ancho = fuente.videoWidth || fuente.naturalWidth || fuente.width;
  const alto = fuente.videoHeight || fuente.naturalHeight || fuente.height;
  const recorte = Math.min(ancho, alto);

  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  canvas
    .getContext('2d')
    .drawImage(fuente, (ancho - recorte) / 2, (alto - recorte) / 2, recorte, recorte, 0, 0, lado, lado);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Achica un ícono manteniendo la transparencia (para los íconos de actividades).
// Los SVG se dejan como están, porque ya son livianos y se ven nítidos.
export async function iconoAchicado(archivo, maximo = 320) {
  const dataUrl = await leerArchivo(archivo);
  if (archivo.type === 'image/svg+xml') return dataUrl;

  const img = await cargarImagen(dataUrl);
  const escala = Math.min(1, maximo / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
