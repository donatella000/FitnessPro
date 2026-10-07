// Funciones de formato compartidas por las pantallas del panel

export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor) {
  return formatoPrecio.format(Number(valor) || 0);
}

// '2026-10-04' -> '04/10/2026'
export function formatearFecha(iso) {
  if (!iso) return '-';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// '08:00:00' -> '08:00'
export function formatearHora(hora) {
  return hora ? String(hora).slice(0, 5) : '';
}

// Fecha de hoy en formato 'AAAA-MM-DD', según la hora local
export function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Suma días a una fecha 'AAAA-MM-DD'
export function sumarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}