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

  return (
    <div className={`franja franja--texto${tema === 'primavera' ? ' franja--primavera' : ''}`} role="note">
      {texto}
    </div>
  );
}

export const temaTieneFranja = (tema) => esPatrio(tema) || Boolean(TEMAS[tema]?.franja);
