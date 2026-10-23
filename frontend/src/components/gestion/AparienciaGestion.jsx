import { useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { TEMAS, useTema } from '../../context/TemaContext';
import Aviso from './Aviso';

// Colores de muestra de cada tema: fondo y acento
const MUESTRAS = {
  normal: ['#01200e', '#0dff4a'],
  navidad: ['#0b2e1a', '#ff4d5a'],
  anio_nuevo: ['#0d0d0d', '#f5c542'],
  pascuas: ['#2a1b4a', '#c9b6ff'],
  patria_25_mayo: ['#0b2545', '#74acdf'],
  patria_bandera: ['#0b2545', '#74acdf'],
  patria_independencia: ['#0b2545', '#74acdf'],
  mundial: ['#0a1f3d', '#8ec5ee'],
  primavera: ['#10331f', '#ff8fb8'],
  halloween: ['#1e0b2e', '#ff7a00'],
};

const DETALLES = {
  normal: 'El diseño habitual del sitio.',
  navidad: 'Gorro de Papá Noel sobre el logo.',
  anio_nuevo: 'Frase "¡FELIZ AÑO NUEVO!" sobre el logo.',
  pascuas: 'Conejo asomándose detrás del logo y huevos de Pascua.',
  patria_25_mayo: 'Escarapela, cinta argentina y "¡FELIZ 25 DE MAYO!".',
  patria_bandera: 'Escarapela, cinta argentina y "¡FELIZ DÍA DE LA BANDERA!".',
  patria_independencia: 'Escarapela, cinta argentina y "¡FELIZ DÍA DE LA INDEPENDENCIA!".',
  mundial: 'Logo en forma de pelota y franja "¡VAMOS ARGENTINA!".',
  primavera: 'Logo en forma de flor y franja "¡FELIZ PRIMAVERA!".',
  halloween: 'Calabaza tallada con gorro de bruja.',
};

// Elección del tema de colores del sitio (solo Admin). Se aplica al instante para todos.
export default function AparienciaGestion() {
  const { tema, setTema } = useTema();
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(null);

  const activar = async (id) => {
    setGuardando(id);
    setAviso(null);
    try {
      await api.put('/dashboard/tema', { tema: id });
      setTema(id);
      setAviso({ tipo: 'ok', texto: `Tema "${TEMAS[id].nombre}" activado. Ya lo ven todos los visitantes.` });
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Tema de colores</h2>
        <p className="seccion__ayuda">
          Elegí el tema para una fecha especial. Queda activo hasta que elijas otro, así que acordate de volver
          al tema Normal cuando pase la fecha. Para ver las decoraciones, abrí la portada.
        </p>

        <div className="temas">
          {Object.entries(TEMAS).map(([id, info]) => {
            const activo = id === tema;
            const [fondo, acento] = MUESTRAS[id];
            return (
              <div key={id} className={`tema${activo ? ' is-activo' : ''}`}>
                <div className="tema__muestra" style={{ background: fondo }} aria-hidden="true">
                  <span className="tema__circulo" style={{ background: acento }} />
                  <span className="tema__boton" style={{ background: acento }} />
                </div>
                <div className="tema__cuerpo">
                  <h3 className="tema__nombre">{info.nombre}</h3>
                  <p className="tema__detalle">{DETALLES[id]}</p>
                  {activo ? (
                    <span className="estado">Activo</span>
                  ) : (
                    <button type="button" className="btn btn--chico" onClick={() => activar(id)} disabled={guardando !== null}>
                      {guardando === id ? 'Activando…' : 'Activar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
