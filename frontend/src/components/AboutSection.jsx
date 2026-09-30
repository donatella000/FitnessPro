import '../styles/AboutSection.css';

export default function AboutSection() {
  return (
    <section id="quienes-somos" className="about">
      <h2 className="about__title">Quiénes somos</h2>

      <div className="about__text">
        <p>
          FitnessPro surge de la idea de cuatro amigos que tenían poco tiempo pero muchas
          ganas de no dejar de entrenar, con el asesoramiento de un profe que acompañe y
          corrija.
        </p>
        <p>
          Pensado para quienes no tienen mucho tiempo pero quieren cuidar su bienestar
          físico, en FitnessPro encontrarás un espacio libre de prejuicios, con actividades
          diseñadas para potenciar tu rendimiento y el acompañamiento continuo del mejor
          equipo profesional para llevarte a tu objetivo.
        </p>
        <p>Empezá a entrenar distinto, empezá con FitnessPro.</p>
      </div>

      <a className="about__cta" href="#equipo">
        Conocé a nuestros profes
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
