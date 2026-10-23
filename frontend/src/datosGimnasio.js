// Datos de contacto del gimnasio. Se usan en la portada (redes y sección de contacto).
// Están tomados del diseño de Canva: si cambian, se modifican solo acá.

export const GIMNASIO = {
  direccion: 'Vieytes 286, Bahía Blanca, Buenos Aires',
  whatsappTexto: '(54) 291 1357 913',
  // Formato internacional para el enlace de WhatsApp (Argentina, celular: 54 9 + característica sin 0 + número)
  whatsappNumero: '5492911357913',
  correo: 'fitnesspro.pps@gmail.com',
  instagram: 'fitnesspro.bb',
};

export const WHATSAPP_URL = `https://wa.me/${GIMNASIO.whatsappNumero}`;
export const INSTAGRAM_URL = `https://www.instagram.com/${GIMNASIO.instagram}/`;
export const MAPA_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(GIMNASIO.direccion)}`;
export const MAPA_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(GIMNASIO.direccion)}&z=16&output=embed`;
