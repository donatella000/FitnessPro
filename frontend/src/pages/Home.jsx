import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import AuthModal from '../components/AuthModal';
import ActivitiesSection from '../components/ActivitiesSection';
import AboutSection from '../components/AboutSection';
import TeamSection from '../components/TeamSection';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';

// Reemplazá estos links por los perfiles reales del gimnasio.
const INSTAGRAM_URL = 'https://www.instagram.com/';
const WHATSAPP_URL = 'https://wa.me/'; // ej: https://wa.me/5492911234567

export default function Home() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  return (
    <>
      <Navbar />

      <main>
        <section id="inicio" className="hero">
          <div className="hero__copy">
            <p className="hero__kicker">Empezá a entrenar distinto</p>
            <h1 className="hero__title">
              Tu objetivo,
              <br />
              nuestra meta.
            </h1>

            {user ? (
              <Link to="/dashboard" className="btn-pill">
                Ir a mi panel
              </Link>
            ) : (
              <button type="button" className="btn-pill" onClick={() => setAuthOpen(true)}>
                Ingresar
              </button>
            )}
          </div>

          <div className="hero__emblem">
            <div className="hero__ring">
              <Logo />
            </div>
          </div>

          <div className="hero__social">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram de FitnessPro">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.2" cy="6.8" r="1" className="dot" />
              </svg>
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp de FitnessPro">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                <path d="M3 21l1.65-4.8A9 9 0 1 1 8.1 19.4L3 21z" />
                <path
                  className="dot"
                  d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.4-2.2-1.1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1.1-2.2L9 8.5z"
                />
              </svg>
            </a>
          </div>
        </section>

        <ActivitiesSection />
        <AboutSection />
        <TeamSection />

        {/* Sección de ejemplo para que el link "Ubicación y contacto" del navbar tenga destino */}
        <section id="contacto" className="placeholder">
          <h2>Ubicación y contacto</h2>
          <p>Próximamente.</p>
        </section>
      </main>

      <AuthModal open={authOpen} onClose={closeAuth} />
    </>
  );
}