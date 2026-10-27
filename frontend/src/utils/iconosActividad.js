import musculacion from '../assets/iconos/musculacion.png';
import yoga from '../assets/iconos/yoga.png';
import pilates from '../assets/iconos/pilates.png';
import spinning from '../assets/iconos/spinning.png';

// Íconos incluidos en la página para las actividades más comunes.
// Se reconocen por el nombre de la actividad (sin importar tildes ni mayúsculas).
const INCLUIDOS = [
  { clave: 'muscula', imagen: musculacion },
  { clave: 'yoga', imagen: yoga },
  { clave: 'pilates', imagen: pilates },
  { clave: 'reformer', imagen: pilates },
  { clave: 'spinning', imagen: spinning },
];

const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Devuelve la imagen del ícono de una actividad:
// 1) el que cargó el admin, 2) uno incluido según el nombre, 3) null (se usa el genérico)
export function iconoDeActividad(actividad) {
  if (actividad.icono) return actividad.icono;
  const nombre = normalizar(actividad.nombre || '');
  if (actividad.tipo === 'musculacion' && !INCLUIDOS.some((i) => nombre.includes(i.clave))) return musculacion;
  return INCLUIDOS.find((i) => nombre.includes(i.clave))?.imagen || null;
}
