import '../styles/Logo.css';

/*
 * Logo dibujado en SVG como aproximación al de tu diseño.
 * Si tenés el logo original (png/svg), guardalo en src/assets/ y reemplazá
 * todo el contenido del return por:
 *   <img className="logo" src={logoUrl} alt="FitnessPro" />
 * con: import logoUrl from '../assets/logo.png';
 */
export default function Logo() {
  return (
    <div className="logo" role="img" aria-label="FitnessPro">
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        {/* flecha ascendente */}
        <polyline
          points="74,50 88,32 100,42 114,22 126,32 142,10"
          fill="none"
          stroke="#fff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="152,4 134,8 148,22" fill="#fff" />

        {/* barra y discos */}
        <g fill="#fff">
          <rect x="22" y="66" width="156" height="8" />
          <rect x="8" y="54" width="10" height="32" rx="2" />
          <rect x="19" y="44" width="9" height="52" rx="2" />
          <rect x="182" y="54" width="10" height="32" rx="2" />
          <rect x="172" y="44" width="9" height="52" rx="2" />
        </g>

        {/* brazos */}
        <g stroke="#fff" strokeWidth="10" strokeLinecap="round">
          <line x1="66" y1="74" x2="86" y2="112" />
          <line x1="134" y1="74" x2="114" y2="112" />
        </g>

        {/* cabeza, torso y piernas */}
        <g fill="#fff">
          <circle cx="100" cy="92" r="12" />
          <path d="M82 108 Q100 102 118 108 L124 134 L114 146 L86 146 L76 134 Z" />
          <path d="M86 142 L68 192 L86 192 L100 160 L114 192 L132 192 L114 142 Z" />
        </g>
      </svg>
      <span className="logo__word">FitnessPro</span>
    </div>
  );
}
