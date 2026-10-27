import { useEffect, useState } from 'react';
import { obtenerEquipo } from '../services/publico';
import { iconoDeActividad } from '../utils/iconosActividad';
import '../styles/ActivitiesSection.css';

// Ícono genérico, para una actividad sin ícono cargado ni incluido
function IconoGenerico() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="12" r="6" fill="#fff" stroke="none" />
        <path d="M32 20l-4 16 8 6 4 14" />
        <path d="M28 36l-10 6" />
        <path d="M32 24l12 6" />
        <path d="M32 24l-12 2" />
      </g>
    </svg>
  );
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
                {iconoDeActividad(a) ? (
                  <img src={iconoDeActividad(a)} alt="" className="activities__icono" />
                ) : (
                  <IconoGenerico />
                )}
              </span>
              <span className="activities__label">{a.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
