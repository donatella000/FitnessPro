import { GIMNASIO, INSTAGRAM_URL, MAPA_EMBED_URL, MAPA_URL, WHATSAPP_URL } from '../datosGimnasio';
import '../styles/ContactSection.css';

const ICONOS = {
  ubicacion: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.6" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3 21l1.65-4.8A9 9 0 1 1 8.1 19.4L3 21z" />
      <path className="relleno" d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.4-2.2-1.1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1.1-2.2L9 8.5z" />
    </>
  ),
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle className="relleno" cx="17.2" cy="6.8" r="1" />
    </>
  ),
};

function Dato({ icono, titulo, children }) {
  return (
    <div className="contacto__dato">
      <svg className="contacto__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONOS[icono]}</svg>
      <div>
        <h3 className="contacto__titulo">{titulo}</h3>
        <p className="contacto__valor">{children}</p>
      </div>
    </div>
  );
}

// Sección "Ubicación y contacto" de la portada, con mapa
export default function ContactSection() {
  return (
    <section id="contacto" className="contacto">
      <h2 className="contacto__encabezado">Ubicación y contacto</h2>

      <div className="contacto__grilla">
        <div className="contacto__datos">
          <p className="contacto__lema">Alcancemos tu objetivo</p>
          <p className="contacto__bajada">Contactanos y empezá a entrenar.</p>

          <Dato icono="ubicacion" titulo="Ubicación">
            <a href={MAPA_URL} target="_blank" rel="noreferrer">{GIMNASIO.direccion}</a>
          </Dato>
          <Dato icono="whatsapp" titulo="WhatsApp">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{GIMNASIO.whatsappTexto}</a>
          </Dato>
          <Dato icono="correo" titulo="Correo electrónico">
            <a href={`mailto:${GIMNASIO.correo}`}>{GIMNASIO.correo}</a>
          </Dato>
          <Dato icono="instagram" titulo="Instagram">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@{GIMNASIO.instagram}</a>
          </Dato>
        </div>

        <div className="contacto__mapa">
          <iframe
            title={`Mapa: ${GIMNASIO.direccion}`}
            src={MAPA_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a className="contacto__como-llegar" href={MAPA_URL} target="_blank" rel="noreferrer">
            Cómo llegar
          </a>
        </div>
      </div>
    </section>
  );
}
