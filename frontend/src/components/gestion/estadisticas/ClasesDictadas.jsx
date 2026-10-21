import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../../services/api';
import { formatearFecha, hoyISO, sumarDias } from '../../../utils/formato';
import Aviso from '../Aviso';

const ESTADOS = {
  asistido: { texto: 'Asistió', clase: '' },
  ausente: { texto: 'No asistió', clase: ' estado--off' },
  cancelado: { texto: 'Canceló', clase: ' estado--off' },
};

// Clases ya finalizadas: cuántos se anotaron y cuántos asistieron.
// Al tocar una clase se ve la lista de alumnos.
export default function ClasesDictadas() {
  const [desde, setDesde] = useState(sumarDias(hoyISO(), -30));
  const [hasta, setHasta] = useState(hoyISO());
  const [idActividad, setIdActividad] = useState('');
  const [actividades, setActividades] = useState([]);
  const [clases, setClases] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [elegida, setElegida] = useState(null); // fila de la clase abierta
  const [alumnos, setAlumnos] = useState(null);

  useEffect(() => {
    api.get('/clases/actividades').then(({ data }) => setActividades(data)).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    try {
      const params = { desde, hasta };
      if (idActividad) params.id_actividad = idActividad;
      const { data } = await api.get('/dashboard/clases-dictadas', { params });
      setClases(data.clases);
      setAviso(null);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  }, [desde, hasta, idActividad]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = async (clase) => {
    setElegida(clase);
    setAlumnos(null);
    try {
      const { data } = await api.get('/dashboard/clases-dictadas/detalle', {
        params: { id_horario: clase.id_horario, fecha: clase.fecha },
      });
      setAlumnos(data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  // Vista de una clase puntual
  if (elegida) {
    return (
      <>
        <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
        <button type="button" className="btn btn--secundario btn--chico" onClick={() => setElegida(null)}>
          ← Volver a la lista de clases
        </button>

        <h3 className="seccion__titulo" style={{ marginTop: 18 }}>
          {elegida.actividad}{elegida.profesor ? ` con ${elegida.profesor}` : ''}
        </h3>
        <p className="seccion__ayuda">
          {elegida.dia_nombre} {formatearFecha(elegida.fecha)}, de {elegida.hora_inicio} a {elegida.hora_fin}. Cupo: {elegida.cupo_maximo}.
        </p>

        <div className="tarjetas">
          <div className="tarjeta"><span className="tarjeta__titulo">Anotados</span><strong className="tarjeta__valor">{elegida.inscriptos}</strong></div>
          <div className="tarjeta"><span className="tarjeta__titulo">Asistieron</span><strong className="tarjeta__valor">{elegida.asistieron}</strong></div>
          <div className="tarjeta"><span className="tarjeta__titulo">Porcentaje de asistencia</span><strong className="tarjeta__valor">{elegida.porcentaje_asistencia}%</strong></div>
        </div>

        {!alumnos ? (
          <p className="cargando">Cargando…</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>DNI</th>
                  <th>Estado</th>
                  <th>Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((a) => {
                  const estado = ESTADOS[a.estado] || ESTADOS.ausente;
                  return (
                    <tr key={a.id_turno}>
                      <td>{a.apellido}, {a.nombre}</td>
                      <td>{a.dni}</td>
                      <td><span className={`estado${estado.clase}`}>{estado.texto}</span></td>
                      <td>
                        {a.ingreso
                          ? `${String(a.ingreso).slice(11, 16)} (${a.tipo_ingreso === 'manual' ? 'manual' : 'molinete'})`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <div className="form form--compacto estadisticas__filtros">
        <label className="campo">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} />
        </label>
        <label className="campo">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} />
        </label>
        <label className="campo">
          Actividad
          <select value={idActividad} onChange={(e) => setIdActividad(e.target.value)}>
            <option value="">Todas</option>
            {actividades.map((a) => <option key={a.id_actividad} value={a.id_actividad}>{a.nombre}</option>)}
          </select>
        </label>
      </div>

      <p className="seccion__ayuda">
        Clases ya finalizadas que tuvieron al menos un alumno anotado. Tocá una fila para ver quiénes asistieron.
      </p>

      {!clases ? (
        <p className="cargando">Cargando…</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla tabla--clic">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Actividad</th>
                <th>Profesor</th>
                <th>Anotados</th>
                <th>Asistieron</th>
                <th>Porcentaje de asistencia</th>
              </tr>
            </thead>
            <tbody>
              {clases.length === 0 && (
                <tr><td colSpan={7} className="tabla__vacia">No hay clases finalizadas en el período.</td></tr>
              )}
              {clases.map((c) => (
                <tr
                  key={`${c.id_horario}-${c.fecha}`}
                  tabIndex={0}
                  onClick={() => abrir(c)}
                  onKeyDown={(e) => e.key === 'Enter' && abrir(c)}
                >
                  <td>{c.dia_nombre} {formatearFecha(c.fecha)}</td>
                  <td>{c.hora_inicio} a {c.hora_fin}</td>
                  <td>{c.actividad}</td>
                  <td>{c.profesor || '-'}</td>
                  <td>{c.inscriptos}</td>
                  <td>{c.asistieron}</td>
                  <td>
                    <span className="mini-barra">
                      <span className="mini-barra__relleno" style={{ width: `${c.porcentaje_asistencia}%` }} />
                    </span>
                    {c.porcentaje_asistencia}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}