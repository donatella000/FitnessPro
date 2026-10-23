import IconoFitness from './IconoFitness';
import '../styles/Logo.css';

// Logo de FitnessPro: ícono (hombrecito con la barra y la flecha) y la palabra
export default function Logo() {
  return (
    <div className="logo">
      <IconoFitness titulo="FitnessPro" />
      <span className="logo__word">FitnessPro</span>
    </div>
  );
}
