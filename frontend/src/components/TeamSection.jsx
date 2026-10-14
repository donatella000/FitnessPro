import { useEffect, useState } from 'react';
import { agruparHorarios, obtenerEquipo } from '../services/publico';
import '../styles/TeamSection.css';

function PersonIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="18" r="10" />
      <path d="M32 30c-8 0-14 8-16 20h10l3-10 3 10h0l3-10 3 10h10c-2-12-8-20-16-20z" />
    </svg>
  );
}

const nombreProfe = (p) => `Profe ${p.nombre}`;

// Nuestro equipo: las actividades, sus profesores activos y los horarios
// salen de la base de datos (ruta pública, no hace falta iniciar sesión).
export default function TeamSection() {
  const [actividades, setActividades] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [idActiva, setIdActiva] = useState(null);
  const [idProfesor, setIdProfesor] = useState(null);
  const [verHorarios, setVerHorarios] = useState(false);

  useEffect(() => {
    obtenerEquipo()
      .then((datos) => {
        setActividades(datos);
        setIdActiva((actual) => actual ?? datos[0]?.id_actividad ?? null);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  // La sección Actividades puede pedir que se abra una actividad puntual
  useEffect(() => {
    const abrir = (e) => elegirActividad(e.detail);
    window.addEventListener('fitnesspro:ver-actividad', abrir);
    return () => window.removeEventListener('fitnesspro:ver-actividad', abrir);
  }, []);

  function elegirActividad(id) {
    setIdActiva(id);
    setIdProfesor(null);
    setVerHorarios(false);
  }

  // Un clic selecciona al profesor y muestra sus horarios; otro clic lo deselecciona
  const elegirProfesor = (id) => {
    if (idProfesor === id) {
      setIdProfesor(null);
      setVerHorarios(false);
    } else {
      setIdProfesor(id);
      setVerHorarios(true);
    }
  };

  const actividad = actividades.find((a) => a.id_actividad === idActiva);
  const esSala = actividad?.tipo === 'musculacion';
  const profesor = actividad?.profesores.find((p) => p.id_profesor === idProfesor);

  // Filas de la tabla: las del profesor elegido, o las de todos
  const filas = actividad
    ? profesor
      ? agruparHorarios(profesor.horarios)
      : agruparHorarios(
        actividad.profesores.flatMap((p) => p.horarios.map((h) => ({ ...h, profesor: nombreProfe(p) }))),
        true
      )
    : [];

  const sala = esSala && actividad.horarios_sala?.length ? agruparHorarios(actividad.horarios_sala) : [];

  return (
    <section id="equipo" className="team">
      <h2 className="team__title">Nuestro equipo</h2>

      {estado === 'cargando' && <p className="team__estado">Cargando…</p>}
      {estado === 'error' && (
        <p className="team__estado">No pudimos cargar la información del equipo. Probá recargar la página.</p>
      )}
      {estado === 'listo' && actividades.length === 0 && (
        <p className="team__estado">Muy pronto vas a ver acá nuestras actividades y profesores.</p>
      )}

      {actividad && (
        <>
          <div className="team__tabs" role="tablist" aria-label="Actividades">
            {actividades.map((a) => (
              <button
                key={a.id_actividad}
                type="button"
                role="tab"
                aria-selected={a.id_actividad === idActiva}
                className={a.id_actividad === idActiva ? 'is-active' : ''}
                onClick={() => elegirActividad(a.id_actividad)}
              >
                {a.nombre}
              </button>
            ))}
          </div>

          <div className="team__panel">
            <h3 className="team__activity">{actividad.nombre}</h3>
            {actividad.descripcion && <p className="team__descripcion">{actividad.descripcion}</p>}

            {actividad.profesores.length === 0 ? (
              <p className="team__estado">Todavía no hay profesores asignados a esta actividad.</p>
            ) : (
              <>
                <p className="team__ayuda">Tocá un profesor para ver sus horarios.</p>
                <div className="team__profs">
                  {actividad.profesores.map((p) => {
                    const elegido = p.id_profesor === idProfesor;
                    return (
                      <button
                        type="button"
                        className={`team__profcard${elegido ? ' is-selected' : ''}`}
                        key={p.id_profesor}
                        aria-pressed={elegido}
                        onClick={() => elegirProfesor(p.id_profesor)}
                      >
                        <span className="team__tombstone">
                          <PersonIcon />
                        </span>
                        <span className="team__profname">{nombreProfe(p).toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {profesor ? (
              <button type="button" className="btn-pill team__toggle" onClick={() => elegirProfesor(profesor.id_profesor)}>
                Ver todos los horarios
              </button>
            ) : (
              <button
                type="button"
                className="btn-pill team__toggle"
                aria-expanded={verHorarios}
                onClick={() => setVerHorarios((v) => !v)}
              >
                {verHorarios ? 'Ocultar horarios' : 'Ver horarios'}
              </button>
            )}

            {verHorarios && (
              <div className="team__schedule">
                {sala.length > 0 && !profesor && (
                  <p className="team__sala">
                    La sala abre {sala.map((s) => `${s.diasTexto.toLowerCase()} de ${s.hora_inicio} a ${s.hora_fin}`).join('; ')}.
                    Reservás tu turno por hora desde tu cuenta.
                  </p>
                )}

                <h4 className="team__schedule-titulo">
                  {profesor
                    ? `Horarios de ${nombreProfe(profesor)}${esSala ? ' en la sala' : ''}`
                    : esSala ? 'Profesores en la sala' : `Horarios de ${actividad.nombre}`}
                </h4>

                {filas.length === 0 ? (
                  <p className="team__estado">No hay horarios cargados.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Días</th>
                        <th scope="col">Horario</th>
                        {!profesor && <th scope="col">{esSala ? 'Profesor en sala' : 'Profesor'}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f) => (
                        <tr key={`${f.diasTexto}-${f.horario}-${f.profesor || ''}`}>
                          <td>{f.diasTexto}</td>
                          <td>{f.horario}</td>
                          {!profesor && <td>{f.profesor}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}