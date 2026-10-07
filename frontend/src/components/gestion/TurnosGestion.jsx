import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearHora, hoyISO } from '../../utils/formato';
import Aviso from './Aviso';

const ESTADOS = {
  reservado: { texto: 'Reservado', clase: '' },
  asistido: { texto: 'Asistió', clase: '' },
  ausente: { texto: 'Ausente', clase: ' estado--off' },
  cancelado: { texto: 'Cancelado', clase: ' estado--off' },
};

// Día de la semana de una fecha 'AAAA-MM-DD': 1 = lunes ... 7 = domingo
const diaDeSemana = (fecha) => ((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

// Turnos de un día: asistencia manual, cancelaciones y asignación de turnos (Admin y Profesor)
export default function TurnosGestion() {
  const [fecha, setFecha] = useState(hoyISO());
  const [idClase, setIdClase] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [clases, setClases] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [asignar, setAsignar] = useState({ id_usuario: '', id_horario: '' });

  const cargarTurnos = useCallback(async () => {
    try {
      const params = { fecha };
      if (idClase) params.id_clase = idClase;
      const { data } = await api.get('/turnos', { params });
      setTurnos(data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, [fecha, idClase]);

  useEffect(() => {
    Promise.all([api.get('/clases'), api.get('/usuarios', { params: { rol: 3 } })])
      .then(([rClases, rAlumnos]) => {
        setClases(rClases.data);
        setAlumnos(rAlumnos.data);
      })
      .catch((error) => setAviso({ tipo: 'error', texto: mensajeDeError(error) }));
  }, []);

  useEffect(() => {
    cargarTurnos();
  }, [cargarTurnos]);

  const ejecutar = async (accion) => {
    setAviso(null);
    try {
      const { data } = await accion();
      setAviso({ tipo: 'ok', texto: data.mensaje });
      await cargarTurnos();
      return true;
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
      return false;
    }
  };

  const asignarTurno = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => api.post('/turnos/asignar', {
      id_usuario: Number(asignar.id_usuario),
      id_horario: Number(asignar.id_horario),
      fecha,
    }));
    if (ok) setAsignar({ id_usuario: '', id_horario: '' });
  };

  // Horarios disponibles para asignar en la fecha elegida
  const dia = diaDeSemana(fecha);
  const horariosDelDia = clases
    .filter((c) => !idClase || String(c.id_clase) === idClase)
    .flatMap((c) => c.horarios
      .filter((h) => h.dia_semana === dia)
      .map((h) => ({
        ...h,
        etiqueta: `${c.actividad}${c.profesor ? ` con ${c.profesor}` : ''}, ${formatearHora(h.hora_inicio)} a ${formatearHora(h.hora_fin)}`,
      })));

  const esPasadoOHoy = fecha <= hoyISO();

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Turnos del día</h2>
        <p className="seccion__ayuda">
          Usá "Registrar asistencia" cuando un alumno no pudo ingresar por el molinete. Descuenta el turno
          de su abono y le suma los puntos, igual que el molinete.
        </p>

        <div className="form form--compacto" style={{ marginBottom: 16 }}>
          <label className="campo">
            Fecha
            <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
          </label>
          <label className="campo">
            Clase
            <select value={idClase} onChange={(e) => setIdClase(e.target.value)}>
              <option value="">Todas</option>
              {clases.map((c) => (
                <option key={c.id_clase} value={c.id_clase}>
                  {c.actividad}{c.profesor ? ` con ${c.profesor}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {cargando ? (
          <p className="cargando">Cargando…</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>Alumno</th>
                  <th>DNI</th>
                  <th>Actividad</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {turnos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="tabla__vacia">No hay turnos para esta fecha.</td>
                  </tr>
                )}
                {turnos.map((t) => {
                  const estado = ESTADOS[t.estado] || ESTADOS.reservado;
                  const pendiente = t.estado === 'reservado' || t.estado === 'ausente';
                  return (
                    <tr key={t.id_turno}>
                      <td>{formatearHora(t.hora_inicio)} a {formatearHora(t.hora_fin)}</td>
                      <td>{t.apellido}, {t.nombre}</td>
                      <td>{t.dni}</td>
                      <td>{t.actividad}{t.profesor ? ` con ${t.profesor}` : ''}</td>
                      <td><span className={`estado${estado.clase}`}>{estado.texto}</span></td>
                      <td>
                        <div className="tabla__acciones">
                          {pendiente && esPasadoOHoy && (
                            <button
                              type="button"
                              className="btn btn--chico"
                              onClick={() => ejecutar(() => api.post(`/turnos/${t.id_turno}/asistencia`))}
                            >
                              Registrar asistencia
                            </button>
                          )}
                          {t.estado === 'reservado' && (
                            <button
                              type="button"
                              className="btn btn--chico btn--peligro"
                              onClick={() => ejecutar(() => api.delete(`/turnos/${t.id_turno}`))}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Anotar a un alumno</h2>
        <p className="seccion__ayuda">
          Se respetan las mismas reglas que cuando reserva el alumno: abono vigente, cupo, un turno por día
          y límite semanal. Se usa la fecha elegida arriba.
        </p>

        <form className="form" onSubmit={asignarTurno}>
          <label className="campo">
            Alumno
            <select
              value={asignar.id_usuario}
              onChange={(e) => setAsignar((a) => ({ ...a, id_usuario: e.target.value }))}
              required
            >
              <option value="">Elegí un alumno</option>
              {alumnos.map((a) => (
                <option key={a.id_usuario} value={a.id_usuario}>{a.apellido}, {a.nombre}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Horario
            <select
              value={asignar.id_horario}
              onChange={(e) => setAsignar((a) => ({ ...a, id_horario: e.target.value }))}
              required
            >
              <option value="">
                {horariosDelDia.length ? 'Elegí un horario' : 'No hay horarios ese día'}
              </option>
              {horariosDelDia.map((h) => (
                <option key={h.id_horario} value={h.id_horario}>{h.etiqueta}</option>
              ))}
            </select>
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn">Anotar</button>
          </div>
        </form>
      </section>
    </>
  );
}