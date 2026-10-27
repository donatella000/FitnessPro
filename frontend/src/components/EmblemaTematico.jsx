import { IconoEnSvg } from './IconoFitness';
import { TEMAS, esPatrio } from '../context/TemaContext';

/*
 * Emblema de la portada: círculo del logo con el ícono y la palabra FITNESSPRO,
 * más las decoraciones de cada tema. Todo es un único SVG de 400 x 460
 * (centro del círculo en 200, 250), así se escala junto con la pantalla.
 */

const CX = 200;
const CY = 250;

// Ícono y palabra centrados en (CX, cy).
// "ancho" es el ancho del ícono; la palabra se ubica debajo, proporcional al tamaño.
const PROPORCION_ICONO = 1124 / 880;

function IconoYPalabra({ color = '#ffffff', contorno = 0, colorContorno = '#1a1a1a', cy = CY, ancho = 150 }) {
  const alto = ancho * PROPORCION_ICONO;
  const tamanioPalabra = ancho * 0.24;
  // El conjunto (ícono + espacio + palabra) queda centrado verticalmente en cy
  const altoTotal = alto + tamanioPalabra * 1.15;
  const arriba = cy - altoTotal / 2;
  return (
    <>
      <IconoEnSvg x={CX - ancho / 2} y={arriba} ancho={ancho} alto={alto} color={color} contorno={contorno} colorContorno={colorContorno} />
      <text
        x={CX}
        y={arriba + altoTotal}
        textAnchor="middle"
        className="emblema__palabra"
        fontSize={tamanioPalabra}
        fill={color}
        stroke={contorno ? colorContorno : 'none'}
        strokeWidth={contorno ? contorno * 1.1 : 0}
        paintOrder="stroke"
      >
        FITNESSPRO
      </text>
    </>
  );
}

// Círculo del color del tema con un aro blanco fino adentro (diseño habitual).
// El aro mide el 95% del círculo, y alrededor queda un resplandor suave.
const RADIO_CIRCULO = 181;
const RADIO_ARO = Math.round(RADIO_CIRCULO * 0.95);

function CirculoBase() {
  return (
    <>
      <defs>
        {/* Relleno del círculo: más claro en el centro y más intenso hacia el borde */}
        <radialGradient id="emblema-relleno" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--emblema-1)' }} />
          <stop offset="55%" style={{ stopColor: 'var(--emblema-2)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--emblema-3)' }} />
        </radialGradient>
        {/* Resplandor que rodea al círculo */}
        <radialGradient id="emblema-resplandor" cx="50%" cy="50%" r="50%">
          <stop offset="80%" style={{ stopColor: 'var(--emblema-2)', stopOpacity: 0.55 }} />
          <stop offset="100%" style={{ stopColor: 'var(--emblema-2)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r="210" fill="url(#emblema-resplandor)" />
      <circle cx={CX} cy={CY} r={RADIO_CIRCULO} fill="url(#emblema-relleno)" />
      <circle cx={CX} cy={CY} r={RADIO_ARO} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" />
    </>
  );
}

// Frase que sigue la media circunferencia superior
function FraseEnArco({ texto, color }) {
  const largo = texto.length > 20 ? 22 : 28;
  return (
    <>
      <defs>
        <path id="emblema-arco" d={`M${CX - 192},${CY} A192,192 0 0 1 ${CX + 192},${CY}`} />
      </defs>
      <text className="emblema__frase" fontSize={largo} fill={color} stroke="var(--bg)" strokeWidth="5" paintOrder="stroke">
        <textPath href="#emblema-arco" startOffset="50%" textAnchor="middle">{texto}</textPath>
      </text>
    </>
  );
}

// ---------- Navidad: gorro de Papá Noel ----------
function GorroNavidad() {
  return (
    <g transform={`translate(0 -46) rotate(-16 ${CX} 120)`}>
      <path d="M108,132 Q130,40 230,30 Q300,26 336,62 Q300,58 282,72 Q300,100 292,132 Z" fill="#d62828" />
      <path d="M140,110 Q170,60 230,50" fill="none" stroke="#a4161a" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
      <rect x="96" y="118" width="208" height="36" rx="18" fill="#ffffff" />
      <circle cx="340" cy="64" r="20" fill="#ffffff" />
    </g>
  );
}

// ---------- Pascuas: conejo asomándose y huevos ----------
function ConejoDetras() {
  return (
    <g>
      <ellipse cx="170" cy="40" rx="17" ry="46" fill="#f4f0ff" transform="rotate(-12 170 40)" />
      <ellipse cx="230" cy="40" rx="17" ry="46" fill="#f4f0ff" transform="rotate(12 230 40)" />
      <ellipse cx="170" cy="44" rx="7" ry="32" fill="#ffb3cf" transform="rotate(-12 170 44)" />
      <ellipse cx="230" cy="44" rx="7" ry="32" fill="#ffb3cf" transform="rotate(12 230 44)" />
      <circle cx={CX} cy="100" r="54" fill="#f4f0ff" />
      <circle cx="182" cy="92" r="6" fill="#1f1238" />
      <circle cx="218" cy="92" r="6" fill="#1f1238" />
      <circle cx="184" cy="90" r="2" fill="#ffffff" />
      <circle cx="220" cy="90" r="2" fill="#ffffff" />
      <ellipse cx={CX} cy="108" rx="7" ry="5" fill="#ff8fb3" />
      <path d="M200,113 L200,120 M200,120 Q192,126 186,121 M200,120 Q208,126 214,121" stroke="#1f1238" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M176,110 L150,104 M176,115 L150,117 M224,110 L250,104 M224,115 L250,117" stroke="#b7a9d6" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

function ManitosConejo() {
  const mano = (x, espejo) => (
    <g transform={espejo ? `translate(${2 * x},0) scale(-1,1)` : undefined}>
      <ellipse cx={x} cy="226" rx="22" ry="32" fill="#f4f0ff" />
      <path d={`M${x + 6},210 L${x + 18},210 M${x + 6},226 L${x + 20},226 M${x + 6},242 L${x + 18},242`} stroke="#c9b6e8" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
  return (
    <>
      {mano(34, false)}
      {mano(366, true)}
    </>
  );
}

function HuevosPascua() {
  return (
    <g>
      <ellipse cx="128" cy="426" rx="22" ry="28" fill="#ffc8dd" />
      <path d="M108,420 l7,-6 7,6 7,-6 7,6 7,-6 6,6" stroke="#e5739d" strokeWidth="3" fill="none" />
      <ellipse cx="172" cy="438" rx="15" ry="19" fill="#bde0fe" />
      <path d="M158,436 h28" stroke="#5aa9e6" strokeWidth="3" />
      <ellipse cx="228" cy="422" rx="28" ry="35" fill="#fff1a8" />
      <circle cx="218" cy="412" r="4" fill="#f4a261" /><circle cx="236" cy="420" r="4" fill="#f4a261" /><circle cx="222" cy="434" r="4" fill="#f4a261" /><circle cx="240" cy="440" r="3" fill="#f4a261" />
      <ellipse cx="276" cy="440" rx="17" ry="21" fill="#c8f7c5" />
      <path d="M260,434 q16,8 32,0 M260,444 q16,8 32,0" stroke="#55a630" strokeWidth="2.6" fill="none" />
    </g>
  );
}

// ---------- Mundial: pelota blanca y negra con el parche central como fondo del logo ----------
function Pelota() {
  const R = 182;
  const poligono = (x, y, r, lados, giro) =>
    Array.from({ length: lados }, (_, i) => {
      const a = ((giro + (i * 360) / lados) * Math.PI) / 180;
      return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
    }).join(' ');

  // Paños blancos hexagonales alrededor del parche central (con costura negra)
  const panios = [36, 108, 180, 252, 324].map((g) => {
    const a = ((g - 90) * Math.PI) / 180;
    return { x: CX + Math.cos(a) * 158, y: CY + Math.sin(a) * 158, giro: g - 90 };
  });

  // Parches negros pentagonales entre los paños, cortados por el borde de la pelota
  const parches = [0, 72, 144, 216, 288].map((g) => {
    const a = ((g - 90) * Math.PI) / 180;
    return { x: CX + Math.cos(a) * 176, y: CY + Math.sin(a) * 176, giro: g - 90 };
  });

  return (
    <g>
      <defs>
        <clipPath id="pelota-borde"><circle cx={CX} cy={CY} r={R} /></clipPath>
      </defs>
      <circle cx={CX} cy={CY} r={R} fill="#ffffff" />
      <g clipPath="url(#pelota-borde)">
        {panios.map((p, i) => (
          <polygon key={`h${i}`} points={poligono(p.x, p.y, 62, 6, p.giro)} fill="#ffffff" stroke="#111111" strokeWidth="5" strokeLinejoin="round" />
        ))}
        {parches.map((p, i) => (
          <polygon key={`p${i}`} points={poligono(p.x, p.y, 50, 5, p.giro)} fill="#111111" stroke="#111111" strokeWidth="5" strokeLinejoin="round" />
        ))}
      </g>
      {/* Parche central: círculo negro que hace de fondo del logo */}
      <circle cx={CX} cy={CY} r="122" fill="#111111" />
      <circle cx={CX} cy={CY} r="112" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#111111" strokeWidth="7" />
    </g>
  );
}

// ---------- Primavera: flor con tallo ----------
function Flor() {
  const cy = 230;
  const petalos = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  return (
    <g>
      <path d={`M${CX},${cy + 120} C${CX - 12},390 ${CX + 10},420 ${CX},460`} stroke="#4a9e1f" strokeWidth="12" fill="none" strokeLinecap="round" />
      <ellipse cx="148" cy="412" rx="46" ry="18" fill="#56a630" transform="rotate(-24 148 412)" />
      <ellipse cx="252" cy="404" rx="46" ry="18" fill="#56a630" transform="rotate(24 252 404)" />
      <path d="M110,428 Q148,410 186,398 M290,420 Q252,402 214,390" stroke="#3e7d1b" strokeWidth="2.4" fill="none" />
      {petalos.map((a, i) => (
        <circle key={i} cx={CX + Math.cos(a) * 152} cy={cy + Math.sin(a) * 152} r="46" fill="#f7b0ba" />
      ))}
      {petalos.map((a, i) => (
        <circle key={`i${i}`} cx={CX + Math.cos(a) * 140} cy={cy + Math.sin(a) * 140} r="26" fill="#f26b6b" />
      ))}
      {petalos.map((a, i) => (
        <line key={`v${i}`} x1={CX + Math.cos(a + 0.39) * 134} y1={cy + Math.sin(a + 0.39) * 134} x2={CX + Math.cos(a + 0.39) * 168} y2={cy + Math.sin(a + 0.39) * 168} stroke="#c2577d" strokeWidth="3" strokeLinecap="round" />
      ))}
      <circle cx={CX} cy={cy} r="138" fill="#ffd23f" stroke="#f2b705" strokeWidth="6" />
    </g>
  );
}

// ---------- Halloween: calabaza con gorro de bruja ----------
function Calabaza() {
  const cy = 280;
  return (
    <g>
      <ellipse cx={CX} cy={cy} rx="186" ry="160" fill="#f57c00" />
      <ellipse cx={CX} cy={cy} rx="62" ry="160" fill="none" stroke="#c25e00" strokeWidth="5" />
      <ellipse cx={CX} cy={cy} rx="124" ry="160" fill="none" stroke="#c25e00" strokeWidth="5" />
      <ellipse cx={CX} cy={cy} rx="186" ry="160" fill="none" stroke="#c25e00" strokeWidth="5" />
    </g>
  );
}

function GorroBruja() {
  return (
    <g>
      <path d="M128,140 Q150,90 172,50 Q196,8 252,4 Q222,24 214,60 Q212,100 272,140 Z" fill="#2d1450" />
      <rect x="132" y="112" width="138" height="22" fill="#ff7a00" />
      <rect x="186" y="110" width="30" height="26" rx="4" fill="none" stroke="#ffd54a" strokeWidth="5" />
      <ellipse cx={CX} cy="142" rx="132" ry="20" fill="#3b1a66" />
    </g>
  );
}

export default function EmblemaTematico({ tema }) {
  const patrio = esPatrio(tema);
  const frase = TEMAS[tema]?.frase;

  return (
    <div className="hero__emblem hero__emblem--tematico">
      <svg viewBox="0 0 400 460" role="img" aria-label="Logo de FitnessPro">
        {tema === 'pascuas' && <ConejoDetras />}

        {tema === 'mundial' && <Pelota />}
        {tema === 'primavera' && <Flor />}
        {tema === 'halloween' && <Calabaza />}
        {!['mundial', 'primavera', 'halloween'].includes(tema) && <CirculoBase />}

        {tema === 'mundial' && <IconoYPalabra ancho={112} />}
        {tema === 'primavera' && <IconoYPalabra contorno={3} colorContorno="#7a4b00" cy={230} ancho={128} />}
        {tema === 'halloween' && <IconoYPalabra color="#ffd54a" contorno={2.5} colorContorno="#8a3300" cy={292} ancho={150} />}
        {!['mundial', 'primavera', 'halloween'].includes(tema) && <IconoYPalabra ancho={158} />}

        {tema === 'navidad' && <GorroNavidad />}
        {tema === 'pascuas' && <><ManitosConejo /><HuevosPascua /></>}
        {tema === 'halloween' && <GorroBruja />}
        {frase && <FraseEnArco texto={frase} color={patrio ? '#ffffff' : 'var(--neon)'} />}
      </svg>
    </div>
  );
}