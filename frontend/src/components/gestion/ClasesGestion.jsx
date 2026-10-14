import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { DIAS, formatearHora } from '../../utils/formato';
import Aviso from './Aviso';

const HORARIO_VACIO = { dia_semana: '1', hora_inicio: '', hora_fin: '', cupo_maximo: '' };
const SALA_VACIO = { id_profesor: '', dias: [1, 2, 3, 4, 5], hora_inicio: '08:00', hora_fin: '15:00' };
const GENERAR_VACIO = {
  dias: [1, 2, 3, 4, 5],
  hora_desde: '08:00',
  hora_hasta: '22:00',
  duracion_minutos: '60',
  cupo_maximo: '20',
};

// Admin: todas las clases, puede elegir profesor.
// Profesor: solo sus clases; las que crea quedan a su nombre.
export default function ClasesGestion({ esAdmin }) {
  const [clases, setClases] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const [nuevaClase, setNuevaClase] = useState({ id_actividad: '', id_profesor: '' });

  // Formulario abierto debajo de una clase: { id_clase, tipo: 'horario' | 'generar' }
  const [abierto, setAbierto] = useState(null);
  const [horario, setHorario] = useState(HORARIO_VACIO);
  const [generar, setGenerar] = useState(GENERAR_VACIO);

  const [editandoCupo, setEditandoCupo] = useState(null); // { id_horario, cupo_maximo }

  // Profesores de sala de musculación (solo Admin)
  const [sala, setSala] = useState([]);
  const [formSala, setFormSala] = useState(SALA_VACIO);

  const cargar = useCallback(async () => {
    try {
      const pedidos = [
        api.get('/clases', { params: esAdmin ? {} : { mias: 1 } }),
        api.get('/clases/actividades'),
      ];
      if (esAdmin) {
        pedidos.push(api.get('/usuarios', { params: { rol: 2 } }));
        pedidos.push(api.get('/clases/sala'));
      }

      const [rClases, rActividades, rProfesores, rSala] = await Promise.all(pedidos);
      setClases(rClases.data);
      setActividades(rActividades.data);
      if (rProfesores) setProfesores(rProfesores.data);
      if (rSala) setSala(rSala.data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, [esAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Ejecuta una acción contra el backend, muestra el resultado y recarga
  const ejecutar = async (accion, mensajeOk) => {
    setAviso(null);
    try {
      const { data } = await accion();
      setAviso({ tipo: 'ok', texto: mensajeOk || data.mensaje });
      await cargar();
      return true;
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
      return false;
    }
  };

  const crearClase = async (e) => {
    e.preventDefault();
    const cuerpo = { id_actividad: Number(nuevaClase.id_actividad) };
    if (esAdmin) cuerpo.id_profesor = Number(nuevaClase.id_profesor);
    const ok = await ejecutar(() => api.post('/clases', cuerpo));
    if (ok) setNuevaClase({ id_actividad: '', id_profesor: '' });
  };

  const abrirFormulario = (id_clase, tipo) => {
    setAbierto(abierto?.id_clase === id_clase && abierto.tipo === tipo ? null : { id_clase, tipo });
    setHorario(HORARIO_VACIO);
    setGenerar(GENERAR_VACIO);
    setFormSala(SALA_VACIO);
  };

  const asignarSala = async (e, id_actividad) => {
    e.preventDefault();
    if (formSala.dias.length === 0) {
      setAviso({ tipo: 'error', texto: 'Elegí al menos un día.' });
      return;
    }
    const ok = await ejecutar(() => api.post('/clases/sala', {
      id_actividad,
      id_profesor: Number(formSala.id_profesor),
      dias: formSala.dias,
      hora_inicio: formSala.hora_inicio,
      hora_fin: formSala.hora_fin,
    }));
    if (ok) setFormSala(SALA_VACIO);
  };

  const alternarDiaSala = (dia) => {
    setFormSala((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia].sort(),
    }));
  };

  const agregarHorario = async (e, id_clase) => {
    e.preventDefault();
    const ok = await ejecutar(() => api.post('/clases/horarios', {
      id_clase,
      dia_semana: Number(horario.dia_semana),
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      cupo_maximo: Number(horario.cupo_maximo),
    }));
    if (ok) setHorario(HORARIO_VACIO);
  };

  const generarHorarios = async (e, id_clase) => {
    e.preventDefault();
    if (generar.dias.length === 0) {
      setAviso({ tipo: 'error', texto: 'Elegí al menos un día.' });
      return;
    }
    const ok = await ejecutar(() => api.post('/clases/horarios/generar', {
      id_clase,
      dias: generar.dias,
      hora_desde: generar.hora_desde,
      hora_hasta: generar.hora_hasta,
      duracion_minutos: Number(generar.duracion_minutos),
      cupo_maximo: Number(generar.cupo_maximo),
    }));
    if (ok) setAbierto(null);
  };

  const alternarDia = (dia) => {
    setGenerar((g) => ({
      ...g,
      dias: g.dias.includes(dia) ? g.dias.filter((d) => d !== dia) : [...g.dias, dia].sort(),
    }));
  };

  const guardarCupo = async () => {
    const ok = await ejecutar(
      () => api.put(`/clases/horarios/${editandoCupo.id_horario}`, { cupo_maximo: Number(editandoCupo.cupo_maximo) }),
      'Cupo actualizado.'
    );
    if (ok) setEditandoCupo(null);
  };

  const actividadesConProfesor = actividades.filter((a) => a.tipo === 'clase');

  if (cargando) return <p className="cargando">Cargando…</p>;

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Nueva clase</h2>
        <p className="seccion__ayuda">
          Una clase es una actividad dictada por un profesor. Después de crearla, cargale sus horarios.
          {esAdmin && ' Musculación no necesita este paso: su clase se crea sola con la actividad.'}
        </p>

        {actividadesConProfesor.length === 0 ? (
          <p className="seccion__ayuda">
            {esAdmin
              ? 'Primero creá una actividad del tipo "Clase con profesor" en la pestaña Actividades.'
              : 'Todavía no hay actividades con profesor. Pedile al administrador que las cree.'}
          </p>
        ) : (
          <form className="form" onSubmit={crearClase}>
            <label className="campo">
              Actividad
              <select
                value={nuevaClase.id_actividad}
                onChange={(e) => setNuevaClase((c) => ({ ...c, id_actividad: e.target.value }))}
                required
              >
                <option value="">Elegí una actividad</option>
                {actividadesConProfesor.map((a) => (
                  <option key={a.id_actividad} value={a.id_actividad}>{a.nombre}</option>
                ))}
              </select>
            </label>

            {esAdmin && (
              <label className="campo">
                Profesor
                <select
                  value={nuevaClase.id_profesor}
                  onChange={(e) => setNuevaClase((c) => ({ ...c, id_profesor: e.target.value }))}
                  required
                >
                  <option value="">Elegí un profesor</option>
                  {profesores.map((p) => (
                    <option key={p.id_usuario} value={p.id_usuario}>{p.apellido}, {p.nombre}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="form__acciones">
              <button type="submit" className="btn">Crear clase</button>
            </div>

            {esAdmin && profesores.length === 0 && (
              <p className="form__nota">No hay profesores cargados. Crealos en la pestaña Usuarios con el rol Profesor.</p>
            )}
          </form>
        )}
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">{esAdmin ? 'Clases y horarios' : 'Mis clases y horarios'}</h2>

        {clases.length === 0 && (
          <p className="seccion__ayuda">Todavía no hay clases. Creá la primera arriba.</p>
        )}

        {clases.map((clase) => {
          const esMusculacion = clase.tipo === 'musculacion';
          const formAbierto = abierto?.id_clase === clase.id_clase ? abierto.tipo : null;

          return (
            <article className="clase" key={clase.id_clase}>
              <div className="clase__cabecera">
                <h3 className="clase__nombre">
                  {clase.actividad}{' '}
                  {!esMusculacion && <span className="clase__profesor">con {clase.profesor}</span>}
                </h3>

                <div className="tabla__acciones">
                  {esMusculacion && (
                    <button type="button" className="btn btn--chico" onClick={() => abrirFormulario(clase.id_clase, 'generar')}>
                      Generar horarios
                    </button>
                  )}
                  {esMusculacion && esAdmin && (
                    <button type="button" className="btn btn--chico btn--secundario" onClick={() => abrirFormulario(clase.id_clase, 'sala')}>
                      Asignar profesor de sala
                    </button>
                  )}
                  <button type="button" className="btn btn--chico btn--secundario" onClick={() => abrirFormulario(clase.id_clase, 'horario')}>
                    Agregar horario
                  </button>
                  {esAdmin && !esMusculacion && (
                    <select
                      className="input-tabla"
                      value=""
                      aria-label="Reasignar profesor"
                      onChange={(e) => e.target.value && ejecutar(
                        () => api.put(`/clases/${clase.id_clase}`, { id_profesor: Number(e.target.value) })
                      )}
                    >
                      <option value="">Cambiar profesor…</option>
                      {profesores
                        .filter((p) => p.id_usuario !== clase.id_profesor)
                        .map((p) => (
                          <option key={p.id_usuario} value={p.id_usuario}>{p.apellido}, {p.nombre}</option>
                        ))}
                    </select>
                  )}
                  {!esMusculacion && (
                    <button
                      type="button"
                      className="btn btn--chico btn--peligro"
                      onClick={() => ejecutar(() => api.delete(`/clases/${clase.id_clase}`))}
                    >
                      Dar de baja
                    </button>
                  )}
                </div>
              </div>

              {formAbierto === 'horario' && (
                <div className="clase__extra">
                  <form className="form form--compacto" onSubmit={(e) => agregarHorario(e, clase.id_clase)}>
                    <label className="campo">
                      Día
                      <select value={horario.dia_semana} onChange={(e) => setHorario((h) => ({ ...h, dia_semana: e.target.value }))}>
                        {DIAS.slice(1).map((nombre, i) => (
                          <option key={nombre} value={i + 1}>{nombre}</option>
                        ))}
                      </select>
                    </label>
                    <label className="campo">
                      Desde
                      <input type="time" value={horario.hora_inicio} onChange={(e) => setHorario((h) => ({ ...h, hora_inicio: e.target.value }))} required />
                    </label>
                    <label className="campo">
                      Hasta
                      <input type="time" value={horario.hora_fin} onChange={(e) => setHorario((h) => ({ ...h, hora_fin: e.target.value }))} required />
                    </label>
                    <label className="campo">
                      Cupo
                      <input type="number" min="1" value={horario.cupo_maximo} onChange={(e) => setHorario((h) => ({ ...h, cupo_maximo: e.target.value }))} required />
                    </label>
                    <div className="form__acciones">
                      <button type="submit" className="btn">Guardar horario</button>
                    </div>
                  </form>
                </div>
              )}

              {formAbierto === 'generar' && (
                <div className="clase__extra">
                  <form className="form form--compacto" onSubmit={(e) => generarHorarios(e, clase.id_clase)}>
                    <div className="campo campo--ancho">
                      Días
                      <div className="casillas">
                        {DIAS.slice(1).map((nombre, i) => (
                          <label key={nombre}>
                            <input type="checkbox" checked={generar.dias.includes(i + 1)} onChange={() => alternarDia(i + 1)} />
                            {nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="campo">
                      Desde
                      <input type="time" value={generar.hora_desde} onChange={(e) => setGenerar((g) => ({ ...g, hora_desde: e.target.value }))} required />
                    </label>
                    <label className="campo">
                      Hasta
                      <input type="time" value={generar.hora_hasta} onChange={(e) => setGenerar((g) => ({ ...g, hora_hasta: e.target.value }))} required />
                    </label>
                    <label className="campo">
                      Duración de cada turno (minutos)
                      <input type="number" min="15" step="5" value={generar.duracion_minutos} onChange={(e) => setGenerar((g) => ({ ...g, duracion_minutos: e.target.value }))} required />
                    </label>
                    <label className="campo">
                      Cupo por turno
                      <input type="number" min="1" value={generar.cupo_maximo} onChange={(e) => setGenerar((g) => ({ ...g, cupo_maximo: e.target.value }))} required />
                    </label>
                    <div className="form__acciones">
                      <button type="submit" className="btn">Generar</button>
                    </div>
                    <p className="form__nota">Los horarios que ya existan no se duplican.</p>
                  </form>
                </div>
              )}

              {formAbierto === 'sala' && (
                <div className="clase__extra">
                  <form className="form form--compacto" onSubmit={(e) => asignarSala(e, clase.id_actividad)}>
                    <label className="campo">
                      Profesor
                      <select value={formSala.id_profesor} onChange={(e) => setFormSala((f) => ({ ...f, id_profesor: e.target.value }))} required>
                        <option value="">Elegí un profesor</option>
                        {profesores.map((p) => (
                          <option key={p.id_usuario} value={p.id_usuario}>{p.apellido}, {p.nombre}</option>
                        ))}
                      </select>
                    </label>
                    <label className="campo">
                      Desde
                      <input type="time" value={formSala.hora_inicio} onChange={(e) => setFormSala((f) => ({ ...f, hora_inicio: e.target.value }))} required />
                    </label>
                    <label className="campo">
                      Hasta
                      <input type="time" value={formSala.hora_fin} onChange={(e) => setFormSala((f) => ({ ...f, hora_fin: e.target.value }))} required />
                    </label>
                    <div className="campo campo--ancho">
                      Días
                      <div className="casillas">
                        {DIAS.slice(1).map((nombre, i) => (
                          <label key={nombre}>
                            <input type="checkbox" checked={formSala.dias.includes(i + 1)} onChange={() => alternarDiaSala(i + 1)} />
                            {nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form__acciones">
                      <button type="submit" className="btn">Asignar</button>
                    </div>
                    <p className="form__nota">
                      Es informativo: se muestra en la portada. El alumno no elige profesor al reservar musculación.
                    </p>
                  </form>
                </div>
              )}

              {esMusculacion && esAdmin && (
                <div className="clase__extra">
                  <p className="clase__subtitulo">Profesores de sala</p>
                  {sala.filter((t) => t.id_actividad === clase.id_actividad).length === 0 ? (
                    <p className="seccion__ayuda" style={{ margin: 0 }}>
                      Sin profesores asignados. Usá "Asignar profesor de sala" para que aparezcan en la portada.
                    </p>
                  ) : (
                    <div className="tabla-contenedor">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Profesor</th>
                            <th>Día</th>
                            <th>Franja</th>
                            <th aria-label="Acciones" />
                          </tr>
                        </thead>
                        <tbody>
                          {sala.filter((t) => t.id_actividad === clase.id_actividad).map((t) => (
                            <tr key={t.id_profesor_sala}>
                              <td>{t.profesor}</td>
                              <td>{t.dia_nombre}</td>
                              <td>{formatearHora(t.hora_inicio)} a {formatearHora(t.hora_fin)}</td>
                              <td>
                                <div className="tabla__acciones">
                                  <button
                                    type="button"
                                    className="btn btn--chico btn--peligro"
                                    onClick={() => ejecutar(() => api.delete(`/clases/sala/${t.id_profesor_sala}`))}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="clase__subtitulo" style={{ marginTop: 18 }}>Horarios de la sala</p>
                </div>
              )}

              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Horario</th>
                      <th>Cupo</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {clase.horarios.length === 0 && (
                      <tr>
                        <td colSpan={4} className="tabla__vacia">
                          Sin horarios. Usá {esMusculacion ? '"Generar horarios" o ' : ''}"Agregar horario".
                        </td>
                      </tr>
                    )}
                    {clase.horarios.map((h) => (
                      <tr key={h.id_horario}>
                        <td>{h.dia_nombre}</td>
                        <td>{formatearHora(h.hora_inicio)} a {formatearHora(h.hora_fin)}</td>
                        <td>
                          {editandoCupo?.id_horario === h.id_horario ? (
                            <input
                              className="input-tabla"
                              type="number"
                              min="1"
                              style={{ maxWidth: 90 }}
                              value={editandoCupo.cupo_maximo}
                              onChange={(e) => setEditandoCupo((c) => ({ ...c, cupo_maximo: e.target.value }))}
                              aria-label="Cupo"
                            />
                          ) : (
                            h.cupo_maximo
                          )}
                        </td>
                        <td>
                          <div className="tabla__acciones">
                            {editandoCupo?.id_horario === h.id_horario ? (
                              <>
                                <button type="button" className="btn btn--chico" onClick={guardarCupo}>Guardar</button>
                                <button type="button" className="btn btn--chico btn--secundario" onClick={() => setEditandoCupo(null)}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn--chico btn--secundario"
                                  onClick={() => setEditandoCupo({ id_horario: h.id_horario, cupo_maximo: String(h.cupo_maximo) })}
                                >
                                  Cambiar cupo
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--chico btn--peligro"
                                  onClick={() => ejecutar(() => api.delete(`/clases/horarios/${h.id_horario}`))}
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}