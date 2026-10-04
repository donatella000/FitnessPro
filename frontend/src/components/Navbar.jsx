import { useState } from 'react';
import UserMenu from './UserMenu';
import '../styles/Navbar.css';

// Cada href apunta a una sección de la Home. El prefijo "/" hace que funcionen
// también parado en /dashboard: el navegador hace una carga completa a "/#seccion".
const LINKS = [
  { href: '/#inicio', label: 'Home' },
  { href: '/#actividades', label: 'Actividades' },
  { href: '/#quienes-somos', label: 'Quiénes somos' },
  { href: '/#contacto', label: 'Ubicación y contacto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <a className="navbar__brand" href="/#inicio" aria-label="FitnessPro, ir al inicio">
        <svg className="navbar__mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <g fill="currentColor">
            <rect x="42" y="0" width="16" height="100" />
            <rect x="42" y="0" width="16" height="100" transform="rotate(60 50 50)" />
            <rect x="42" y="0" width="16" height="100" transform="rotate(120 50 50)" />
          </g>
        </svg>
      </a>

      <button
        type="button"
        className="navbar__toggle"
        aria-expanded={open}
        aria-controls="menu-principal"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M5 5l14 14M19 5L5 19" />
          ) : (
            <path d="M3 7h18M3 12h18M3 17h18" />
          )}
        </svg>
      </button>

      <nav
        id="menu-principal"
        className={`navbar__links${open ? ' is-open' : ''}`}
        aria-label="Principal"
      >
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
      </nav>

      {/* Con la sesión iniciada, muestra el avatar con el menú desplegable */}
      <UserMenu />
    </header>
  );
}