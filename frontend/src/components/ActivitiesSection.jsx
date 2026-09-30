import '../styles/ActivitiesSection.css';

// Para cambiar los íconos, reemplazá el contenido de cada <svg>.
const ACTIVITIES = [
  {
    id: 'musculacion',
    label: 'Musculación',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
          <line x1="14" y1="32" x2="50" y2="32" />
          <line x1="8" y1="24" x2="8" y2="40" />
          <line x1="16" y1="20" x2="16" y2="44" />
          <line x1="56" y1="24" x2="56" y2="40" />
          <line x1="48" y1="20" x2="48" y2="44" />
        </g>
      </svg>
    ),
  },
  {
    id: 'yoga',
    label: 'Yoga',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="12" r="6" fill="#fff" stroke="none" />
          <path d="M32 20v14" />
          <path d="M32 24c-8 2-10 10-16 12" />
          <path d="M32 24c8 2 10 10 16 12" />
          <path d="M32 34c-6 4-6 10-14 14" />
          <path d="M32 34c6 4 6 10 14 14" />
        </g>
      </svg>
    ),
  },
  {
    id: 'pilates',
    label: 'Pilates reformer',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="38" width="48" height="6" rx="2" />
          <line x1="12" y1="44" x2="12" y2="50" />
          <line x1="52" y1="44" x2="52" y2="50" />
          <circle cx="20" cy="26" r="5" fill="#fff" stroke="none" />
          <path d="M25 30l18 6" />
          <path d="M43 36l8-6" />
          <path d="M25 30l-6 8" />
        </g>
      </svg>
    ),
  },
  {
    id: 'spinning',
    label: 'Spinning',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="46" r="9" />
          <circle cx="48" cy="46" r="9" />
          <path d="M16 46l14-20h10l8 20" />
          <path d="M30 26l-6-8h-6" />
          <circle cx="27" cy="14" r="4" fill="#fff" stroke="none" />
        </g>
      </svg>
    ),
  },
];

export default function ActivitiesSection() {
  return (
    <section id="actividades" className="activities">
      <h2 className="activities__title">Actividades</h2>
      <p className="activities__subtitle">
        Descubrí nuestras opciones de entrenamiento y desbloqueá tu mejor versión.
      </p>

      <div className="activities__grid">
        {ACTIVITIES.map((a) => (
          <div className="activities__card" key={a.id}>
            <div className="activities__banner">{a.icon}</div>
            <span className="activities__label">{a.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
