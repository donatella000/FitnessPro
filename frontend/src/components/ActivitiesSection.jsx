import { useEffect, useState } from 'react';
import { obtenerEquipo } from '../services/publico';
import '../styles/ActivitiesSection.css';

// Íconos conocidos según el nombre de la actividad.
// Una actividad nueva que no coincida con ninguno usa el ícono genérico.
const ICONOS = {
  musculacion: (
    <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
      <line x1="14" y1="32" x2="50" y2="32" />
      <line x1="8" y1="24" x2="8" y2="40" />
      <line x1="16" y1="20" x2="16" y2="44" />
      <line x1="56" y1="24" x2="56" y2="40" />
      <line x1="48" y1="20" x2="48" y2="44" />
    </g>
  ),
  yoga: (
    <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="12" r="6" fill="#fff" stroke="none" />
      <path d="M32 20v14" />
      <path d="M32 24c-8 2-10 10-16 12" />
      <path d="M32 24c8 2 10 10 16 12" />
      <path d="M32 34c-6 4-6 10-14 14" />
      <path d="M32 34c6 4 6 10 14 14" />
    </g>
  ),
  pilates: (
    <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="38" width="48" height="6" rx="2" />
      <line x1="12" y1="44" x2="12" y2="50" />
      <line x1="52" y1="44" x2="52" y2="50" />
      <circle cx="20" cy="26" r="5" fill="#fff" stroke="none" />
      <path d="M25 30l18 6" />
      <path d="M43 36l8-6" />
      <path d="M25 30l-6 8" />
    </g>
  ),
  spinning: (
    <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="46" r="9" />
      <circle cx="48" cy="46" r="9" />
      <path d="M16 46l14-20h10l8 20" />
      <path d="M30 26l-6-8h-6" />
      <circle cx="27" cy="14" r="4" fill="#fff" stroke="none" />
    </g>
  ),
  generico: (
    <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="12" r="6" fill="#fff" stroke="none" />
      <path d="M32 20l-4 16 8 6 4 14" />
      <path d="M28 36l-10 6" />
      <path d="M32 24l12 6" />
      <path d="M32 24l-12 2" />
    </g>
  ),
};

// Quita tildes y pasa a minúsculas para comparar nombres
const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function iconoPara(actividad) {
  const nombre = normalizar(actividad.nombre);
  if (actividad.tipo === 'musculacion' || nombre.includes('muscula')) return ICONOS.musculacion;
  const clave = Object.keys(ICONOS).find((k) => k !== 'generico' && nombre.includes(k));
  return ICONOS[clave] || ICONOS.generico;
}

// Lista que se muestra si no se pudo consultar la base
const RESPALDO = [
  { id_actividad: 'm', nombre: 'Musculación', tipo: 'musculacion' },
  { id_actividad: 'y', nombre: 'Yoga', tipo: 'clase' },
  { id_actividad: 'p', nombre: 'Pilates reformer', tipo: 'clase' },
  { id_actividad: 's', nombre: 'Spinning', tipo: 'clase' },
];

export default function ActivitiesSection() {
  const [actividades, setActividades] = useState(null);

  useEffect(() => {
    obtenerEquipo()
      .then(setActividades)
      .catch(() => setActividades(RESPALDO));
  }, []);

  // Al tocar una actividad, baja hasta Nuestro equipo con esa actividad abierta
  const verActividad = (id) => {
    if (typeof id === 'number') {
      window.dispatchEvent(new CustomEvent('fitnesspro:ver-actividad', { detail: id }));
    }
    document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="actividades" className="activities">
      <h2 className="activities__title">Actividades</h2>
      <p className="activities__subtitle">
        Descubrí nuestras opciones de entrenamiento y desbloqueá tu mejor versión.
      </p>

      {actividades && (
        <div className="activities__grid">
          {actividades.map((a) => (
            <button
              type="button"
              className="activities__card"
              key={a.id_actividad}
              onClick={() => verActividad(a.id_actividad)}
              aria-label={`Ver profesores y horarios de ${a.nombre}`}
            >
              <span className="activities__banner">
                <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">{iconoPara(a)}</svg>
              </span>
              <span className="activities__label">{a.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}