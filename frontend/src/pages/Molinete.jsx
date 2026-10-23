import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import '../styles/Molinete.css';

// Si en el .env del frontend se define VITE_MOLINETE_CLAVE, se envía al backend.
// Tiene que coincidir con MOLINETE_CLAVE del .env del backend.
const CLAVE = import.meta.env.VITE_MOLINETE_CLAVE;
const SEGUNDOS_MENSAJE = 4;
const SEGUNDOS_CUMPLEANIOS = 8; // en el cumpleaños el saludo queda un rato más
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ingresar'];

// Pantalla de la computadora de la entrada: el alumno escribe su DNI
// en el teclado numérico y el sistema decide si abre el molinete.
// Usa fetch directamente (no el servicio api) porque esta pantalla no tiene sesión.
export default function Molinete() {
  const [dni, setDni] = useState('');
  const [resultado, setResultado] = useState(null); // { acceso, mensaje, cumpleanios }
  const [enviando, setEnviando] = useState(false);
  const temporizador = useRef(null);

  const reiniciar = useCallback(() => {
    clearTimeout(temporizador.current);
    setResultado(null);
    setDni('');
  }, []);

  const mostrar = useCallback((datos) => {
    setResultado(datos);
    clearTimeout(temporizador.current);
    const segundos = datos.cumpleanios ? SEGUNDOS_CUMPLEANIOS : SEGUNDOS_MENSAJE;
    temporizador.current = setTimeout(reiniciar, segundos * 1000);
  }, [reiniciar]);

  const ingresar = useCallback(async () => {
    if (dni.length < 6 || enviando) return;
    setEnviando(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (CLAVE) headers['x-molinete-clave'] = CLAVE;

      const res = await fetch(`${API_URL}/turnos/molinete/ingreso`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ dni }),
      });
      const datos = await res.json().catch(() => ({}));
      mostrar({
        acceso: Boolean(datos.acceso),
        mensaje: datos.mensaje || 'No se pudo validar el ingreso.',
        cumpleanios: Boolean(datos.acceso && datos.cumpleanios),
      });
    } catch {
      mostrar({ acceso: false, mensaje: 'Sin conexión con el sistema. Acercate a recepción.' });
    } finally {
      setEnviando(false);
    }
  }, [dni, enviando, mostrar]);

  const presionar = useCallback((tecla) => {
    if (resultado) return;
    if (tecla === 'borrar') setDni((d) => d.slice(0, -1));
    else if (tecla === 'ingresar') ingresar();
    else setDni((d) => (d.length < 10 ? d + tecla : d));
  }, [resultado, ingresar]);

  // También funciona con el teclado físico de la computadora
  useEffect(() => {
    const alApretar = (e) => {
      if (/^\d$/.test(e.key)) presionar(e.key);
      else if (e.key === 'Backspace') presionar('borrar');
      else if (e.key === 'Enter') presionar('ingresar');
      else if (e.key === 'Escape') reiniciar();
    };
    window.addEventListener('keydown', alApretar);
    return () => window.removeEventListener('keydown', alApretar);
  }, [presionar, reiniciar]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const salir = () => mostrar({ acceso: true, mensaje: 'Molinete liberado para salir. ¡Hasta la próxima!' });

  return (
    <main className={`molinete${resultado ? (resultado.acceso ? ' is-ok' : ' is-error') : ''}`}>
      <header className="molinete__cabecera">
        <svg className="molinete__marca" viewBox="0 0 100 100" aria-hidden="true">
          <g fill="currentColor">
            <rect x="42" y="0" width="16" height="100" />
            <rect x="42" y="0" width="16" height="100" transform="rotate(60 50 50)" />
            <rect x="42" y="0" width="16" height="100" transform="rotate(120 50 50)" />
          </g>
        </svg>
        <span>FitnessPro</span>
      </header>

      {resultado ? (
        <section className="molinete__resultado" role="status" aria-live="assertive">
          {resultado.cumpleanios && (
            <>
              <div className="molinete__confeti" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ '--i': i }} />)}
              </div>
              <p className="molinete__cumple">¡FELIZ CUMPLEAÑOS!</p>
            </>
          )}
          <div className="molinete__icono" aria-hidden="true">{resultado.acceso ? '✓' : '✕'}</div>
          <p className="molinete__mensaje">{resultado.mensaje}</p>
          {resultado.cumpleanios && (
            <p className="molinete__regalo">Te dejamos un regalo de puntos en tu cuenta.</p>
          )}
          {!resultado.acceso && (
            <button type="button" className="molinete__volver" onClick={reiniciar}>Volver a intentar</button>
          )}
        </section>
      ) : (
        <section className="molinete__ingreso">
          <h1 className="molinete__titulo">Ingresá tu DNI</h1>
          <div className="molinete__pantalla" aria-live="polite" aria-label="DNI ingresado">
            {dni || <span className="molinete__placeholder">Sin puntos</span>}
          </div>

          <div className="molinete__teclado">
            {TECLAS.map((t) => (
              <button
                key={t}
                type="button"
                className={`tecla${t === 'ingresar' ? ' tecla--ingresar' : ''}${t === 'borrar' ? ' tecla--borrar' : ''}`}
                onClick={() => presionar(t)}
                disabled={(t === 'ingresar' && (dni.length < 6 || enviando)) || (t === 'borrar' && !dni)}
              >
                {t === 'borrar' ? 'Borrar' : t === 'ingresar' ? (enviando ? '…' : 'Ingresar') : t}
              </button>
            ))}
          </div>

          <button type="button" className="molinete__salida" onClick={salir}>
            Botón de salida
          </button>
        </section>
      )}
    </main>
  );
}
