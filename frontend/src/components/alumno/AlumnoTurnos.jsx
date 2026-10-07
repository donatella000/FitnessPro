import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha } from '../../utils/formato';
import Aviso from '../gestion/Aviso';

const ABREVIATURA = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Reserva de turnos: actividad -> profesor -> día -> horario
export default function AlumnoTurnos({ onIr }) {
  const [actividades, setActividades] = useState([]);
  const [misTurnos, setMisTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const [idActividad, setIdActividad] = useState(null);
  const [idClase, setIdClase] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargarBase = useCallback(async () => {
    try {
      const [rAct, rTurnos] = await Promise.all([
        api.get('/turnos/mis-actividades'),
        api.get('/turnos/mis-turnos'),
      ]);
      setActividades(rAct.data);
      setMisTurnos(rTurnos.data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarDisponibilidad = useCallback(async (id_clase) => {
    try {
      const { data } = await api.get('/turnos/disponibilidad', { params: { id_clase } });
      setDisponibilidad(data);
      // Mantener el día elegido si sigue en la grilla; si no, el primero
      setFecha((actual) => (data.dias.some((d) => d.fecha === actual) ? actual : data.dias[0].fecha));
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  }, []);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);

  useEffect(() => {
    if (idClase) cargarDisponibilidad(idClase);
  }, [idClase, cargarDisponibilidad]);

  const elegirActividad = (actividad) => {
    setIdActividad(actividad.id_actividad);
    setDisponibilidad(null);
    // Musculación o una sola clase: se elige sola
    setIdClase(actividad.clases.length === 1 ? actividad.clases[0].id_clase : null);
  };

  const ejecutar = async (accion) => {
    setProcesando(true);
    setAviso(null);
    try {
      const { data } = await accion();
      setAviso({ tipo: 'ok', texto: data.mensaje });
      await Promise.all([cargarBase(), idClase ? cargarDisponibilidad(idClase) : null]);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setProcesando(false);
    }
  };

  const reservar = (id_horario) => ejecutar(() => api.post('/turnos', { id_horario, fecha }));
  const cancelar = (id_turno) => ejecutar(() => api.delete(`/turnos/${id_turno}`));

  if (cargando) return <p className="dash__status">Cargando…</p>;

  if (actividades.length === 0) {
    return (
      <section className="alumno__seccion alumno__vacio">
        <p>Para reservar turnos necesitás un abono activo.</p>
        <button type="button" className="btn-pill" onClick={() => onIr('pagos')}>Elegir un abono</button>
      </section>
    );
  }

  const actividad = actividades.find((a) => a.id_actividad === idActividad);
  const dia = disponibilidad?.dias.find((d) => d.fecha === fecha);

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="alumno__seccion">
        <h2 className="seccion__titulo">Reservar un turno</h2>

        <p className="alumno__paso">Actividad</p>
        <div className="chips">
          {actividades.map((a) => (
            <button
              key={a.id_actividad}
              type="button"
              className={`chip${a.id_actividad === idActividad ? ' is-active' : ''}`}
              onClick={() => elegirActividad(a)}
            >
              {a.actividad}
              <small>{a.turnos_restantes} turnos, vence {formatearFecha(a.fecha_fin)}</small>
            </button>
          ))}
        </div>

        {actividad && actividad.tipo === 'clase' && actividad.clases.length > 1 && (
          <>
            <p className="alumno__paso">Profesor</p>
            <div className="chips">
              {actividad.clases.map((c) => (
                <button
                  key={c.id_clase}
                  type="button"
                  className={`chip${c.id_clase === idClase ? ' is-active' : ''}`}
                  onClick={() => setIdClase(c.id_clase)}
                >
                  {c.profesor}
                </button>
              ))}
            </div>
          </>
        )}

        {disponibilidad && (
          <>
            <p className="alumno__paso">Día</p>
            <div className="dias" role="tablist" aria-label="Días disponibles">
              {disponibilidad.dias.map((d) => (
                <button
                  key={d.fecha}
                  type="button"
                  role="tab"
                  aria-selected={d.fecha === fecha}
                  className={`dia${d.fecha === fecha ? ' is-active' : ''}${d.horarios.length === 0 ? ' is-vacio' : ''}`}
                  onClick={() => setFecha(d.fecha)}
                >
                  <span>{ABREVIATURA[d.dia_semana]}</span>
                  <strong>{d.fecha.slice(8, 10)}</strong>
                  {d.ya_tiene_turno && <i className="dia__marca" aria-label="Ya tenés turno" />}
                </button>
              ))}
            </div>

            <p className="alumno__paso">Horario</p>
            {dia && dia.horarios.length === 0 && (
              <p className="seccion__ayuda">No hay horarios este día.</p>
            )}

            {dia && dia.horarios.length > 0 && (
              <ul className="horarios">
                {dia.horarios.map((h) => (
                  <li key={h.id_horario} className={`horario${h.reservado_por_mi ? ' is-mio' : ''}`}>
                    <span className="horario__hora">{h.hora_inicio} a {h.hora_fin}</span>
                    <span className="horario__cupo">
                      {h.reservado_por_mi
                        ? 'Tu turno'
                        : h.cupo_disponible === 0
                          ? 'Sin cupo'
                          : `${h.cupo_disponible} de ${h.cupo_maximo} lugares`}
                    </span>
                    {h.reservado_por_mi ? (
                      <button
                        type="button"
                        className="btn btn--chico btn--peligro"
                        disabled={!h.puede_cancelar || procesando}
                        title={h.puede_cancelar ? undefined : 'Solo se puede cancelar hasta 2 horas antes'}
                        onClick={() => cancelar(h.id_turno)}
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--chico"
                        disabled={!h.puede_reservar || procesando}
                        onClick={() => reservar(h.id_horario)}
                      >
                        Reservar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {dia?.ya_tiene_turno && (
              <p className="form__nota">Ya tenés un turno de esta actividad este día. Se permite uno por día.</p>
            )}
          </>
        )}
      </section>

      <section className="alumno__seccion">
        <h2 className="seccion__titulo">Mis próximos turnos</h2>
        {misTurnos.length === 0 ? (
          <p className="seccion__ayuda">No tenés turnos reservados.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Actividad</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {misTurnos.map((t) => (
                  <tr key={t.id_turno}>
                    <td>{t.dia_nombre} {formatearFecha(t.fecha)}</td>
                    <td>{t.hora_inicio} a {t.hora_fin}</td>
                    <td>{t.actividad}{t.profesor ? ` con ${t.profesor}` : ''}</td>
                    <td>
                      <div className="tabla__acciones">
                        {t.estado === 'reservado' && (
                          <button
                            type="button"
                            className="btn btn--chico btn--peligro"
                            disabled={!t.puede_cancelar || procesando}
                            title={t.puede_cancelar ? undefined : 'Solo se puede cancelar hasta 2 horas antes'}
                            onClick={() => cancelar(t.id_turno)}
                          >
                            Cancelar
                          </button>
                        )}
                        {t.estado === 'asistido' && <span className="estado">Asististe</span>}
                        {t.estado === 'ausente' && <span className="estado estado--off">Ausente</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}