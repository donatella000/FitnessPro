// Escarapela argentina con el Sol de Mayo (se muestra en la barra en las fechas patrias)
const CELESTE = '#74acdf';
const SOL = '#f6b40e';

export default function Escarapela({ className }) {
  const ondas = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return <circle key={i} cx={50 + Math.cos(a) * 40} cy={50 + Math.sin(a) * 40} r="9" fill={CELESTE} />;
  });

  const rayos = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const ancho = i % 2 === 0 ? 0.16 : 0.1;
    const largo = i % 2 === 0 ? 20 : 17;
    const p = (ang, r) => `${50 + Math.cos(ang) * r},${50 + Math.sin(ang) * r}`;
    return <polygon key={i} points={`${p(a - ancho, 10)} ${p(a, largo)} ${p(a + ancho, 10)}`} fill={SOL} />;
  });

  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="Escarapela argentina">
      {ondas}
      <circle cx="50" cy="50" r="40" fill={CELESTE} />
      <circle cx="50" cy="50" r="33" fill="#ffffff" />
      <circle cx="50" cy="50" r="28" fill={CELESTE} />
      <circle cx="50" cy="50" r="23" fill="#ffffff" />
      {rayos}
      <circle cx="50" cy="50" r="10" fill={SOL} />
      <circle cx="46.5" cy="48.5" r="1.2" fill="#9a5f05" />
      <circle cx="53.5" cy="48.5" r="1.2" fill="#9a5f05" />
      <path d="M46.5,53.5 Q50,56 53.5,53.5" fill="none" stroke="#9a5f05" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
