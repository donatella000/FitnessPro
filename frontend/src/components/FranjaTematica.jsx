import { TEMAS, esPatrio } from '../context/TemaContext';

// Cinta argentina con forma de onda, de lado a lado de la página
// (tres franjas: celeste, blanca y celeste)
function CintaArgentina() {
  const onda = (y) => `M0,${y} C150,${y - 10} 300,${y + 10} 450,${y} S750,${y - 10} 900,${y} S1050,${y + 10} 1200,${y}`;
  return (
    <svg viewBox="0 0 1200 52" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={onda(12)} stroke="#74acdf" strokeWidth="13" fill="none" />
      <path d={onda(26)} stroke="#ffffff" strokeWidth="14" fill="none" />
      <path d={onda(40)} stroke="#74acdf" strokeWidth="13" fill="none" />
    </svg>
  );
}

// Tres estrellas doradas dibujadas (no emojis, para que se vean igual en todos los dispositivos)
function Estrellas() {
  const estrella = 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z';
  return (
    <span className="franja__estrellas" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" focusable="false">
          <path d={estrella} fill="#f6c445" stroke="#b8860b" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

// Franja superior de la portada según el tema activo
export default function FranjaTematica({ tema }) {
  if (esPatrio(tema)) {
    return (
      <div className="franja">
        <CintaArgentina />
      </div>
    );
  }

  const texto = TEMAS[tema]?.franja;
  if (!texto) return null;

  // Mundial: tres estrellas a cada lado, por las tres copas
  if (tema === 'mundial') {
    return (
      <div className="franja franja--texto" role="note" aria-label={`${texto} Tres estrellas por las tres copas del mundo.`}>
        <span className="franja__contenido">
          <Estrellas />
          <span>{texto}</span>
          <Estrellas />
        </span>
      </div>
    );
  }

  return (
    <div className={`franja franja--texto${tema === 'primavera' ? ' franja--primavera' : ''}`} role="note">
      {texto}
    </div>
  );
}

export const temaTieneFranja = (tema) => esPatrio(tema) || Boolean(TEMAS[tema]?.franja);
