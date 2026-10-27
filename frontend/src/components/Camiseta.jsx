// Camiseta argentina con el número 10 (reemplaza al asterisco de la barra en el Mundial)
export default function Camiseta({ className }) {
  const azul = '#1f3a52';
  const celeste = '#75aadb';
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="Camiseta argentina número 10">
      <defs>
        <clipPath id="camiseta-forma">
          <path d="M33,10 Q50,18 67,10 L88,22 L96,42 L80,48 L78,92 L22,92 L20,48 L4,42 L12,22 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#camiseta-forma)">
        <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
        {/* Franjas celestes verticales */}
        <rect x="14" y="0" width="11" height="100" fill={celeste} />
        <rect x="36" y="0" width="11" height="100" fill={celeste} />
        <rect x="58" y="0" width="11" height="100" fill={celeste} />
        <rect x="80" y="0" width="11" height="100" fill={celeste} />
        {/* Puños de las mangas */}
        <path d="M2,40 L18,46 L19,50 L3,44 Z" fill={azul} />
        <path d="M98,40 L82,46 L81,50 L97,44 Z" fill={azul} />
      </g>
      <path d="M33,10 Q50,18 67,10 L88,22 L96,42 L80,48 L78,92 L22,92 L20,48 L4,42 L12,22 Z" fill="none" stroke="#d9dee4" strokeWidth="1.5" />
      {/* Cuello */}
      <path d="M33,10 Q50,20 67,10 Q50,26 33,10 Z" fill={azul} />
      {/* Número 10 */}
      <text
        x="50"
        y="74"
        textAnchor="middle"
        fontFamily="var(--font), Arial, sans-serif"
        fontWeight="700"
        fontSize="38"
        fill={azul}
        stroke="#ffffff"
        strokeWidth="2.4"
        paintOrder="stroke"
      >
        10
      </text>
    </svg>
  );
}
