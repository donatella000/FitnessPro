import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from './Aviso';

const DIAS = [1, 2, 3];
const MAX_EJERCICIOS = 8;
const FILA_VACIA = { id_ejercicio: '', series: '3', repeticiones: '10', peso_kg: '', observaciones: '' };

const rutinaVacia = () => ({ 1: [], 2: [], 3: [] });

// Convierte la rutina que devuelve el backend al formato del formulario
const aFormulario = (rutina) => {
  const dias = rutinaVacia();
  rutina.dias.forEach((d) => {
    dias[d.dia] = d.ejercicios.map((e) => ({
      id_ejercicio: String(e.id_ejercicio),
      series: String(e.series),
      repeticiones: String(e.repeticiones),
      peso_kg: e.peso_kg === null ? '' : String(Number(e.peso_kg)),
      observaciones: e.observaciones || '',
    }));
  });
  return dias;
};

// Armado de rutinas de musculación: 3 días, hasta 8 ejercicios por día (Admin y Profesor)
export default function RutinasGestion() {
  const [alumnos, setAlumnos] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [aviso, setAviso] = useState(null);

  const [idAlumno, setIdAlumno] = useState('');
  const [rutina, setRutina] = useState(null); // la rutina guardada, o null si no tiene
  const [nombre, setNombre] = useState('');
  const [dias, setDias] = useState(rutinaVacia());
  const [diaActivo, setDiaActivo] = useState(1);
  const [cargandoRutina, setCargandoRutina] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/usuarios', { params: { rol: 3 } }), api.get('/rutinas/ejercicios')])
      .then(([rAlumnos, rEjercicios]) => {
        setAlumnos(rAlumnos.data);
        setEjercicios(rEjercicios.data);
      })
      .catch((error) => setAviso({ tipo: 'error', texto: mensajeDeError(error) }));
  }, []);

  const cargarRutina = async (id) => {
    setIdAlumno(id);
    setAviso(null);
    setDiaActivo(1);
    if (!id) {
      setRutina(null);
      return;
    }
    setCargandoRutina(true);
    try {
      const { data } = await api.get(`/rutinas/alumno/${id}`);
      setRutina(data);
      setNombre(data?.nombre || '');
      setDias(data ? aFormulario(data) : rutinaVacia());
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargandoRutina(false);
    }
  };

  const cambiarFila = (dia, indice, campo, valor) => {
    setDias((d) => ({
      ...d,
      [dia]: d[dia].map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)),
    }));
  };

  const agregarFila = (dia) => setDias((d) => ({ ...d, [dia]: [...d[dia], { ...FILA_VACIA }] }));

  const quitarFila = (dia, indice) => setDias((d) => ({ ...d, [dia]: d[dia].filter((_, i) => i !== indice) }));

  // Subir o bajar un ejercicio dentro del día
  const moverFila = (dia, indice, direccion) => {
    setDias((d) => {
      const lista = [...d[dia]];
      const destino = indice + direccion;
      if (destino < 0 || destino >= lista.length) return d;
      [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
      return { ...d, [dia]: lista };
    });
  };

  const guardar = async () => {
    const cuerpo = {
      nombre: nombre.trim() || null,
      dias: DIAS
        .filter((dia) => dias[dia].length > 0)
        .map((dia) => ({
          dia,
          ejercicios: dias[dia].map((f) => ({
            id_ejercicio: Number(f.id_ejercicio),
            series: Number(f.series),
            repeticiones: Number(f.repeticiones),
            peso_kg: f.peso_kg === '' ? null : Number(f.peso_kg),
            observaciones: f.observaciones.trim() || null,
          })),
        })),
    };

    const incompleta = cuerpo.dias.some((d) => d.ejercicios.some((e) => !e.id_ejercicio));
    if (incompleta) {
      setAviso({ tipo: 'error', texto: 'Hay filas sin ejercicio elegido. Completalas o quitalas.' });
      return;
    }

    setGuardando(true);
    setAviso(null);
    try {
      if (rutina) {
        await api.put(`/rutinas/${rutina.id_rutina}`, cuerpo);
      } else {
        await api.post('/rutinas', { ...cuerpo, id_alumno: Number(idAlumno) });
      }
      setAviso({ tipo: 'ok', texto: 'Rutina guardada.' });
      await cargarRutina(idAlumno);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const darDeBaja = async () => {
    if (!window.confirm('¿Dar de baja esta rutina? El alumno se queda sin rutina asignada.')) return;
    try {
      const { data } = await api.delete(`/rutinas/${rutina.id_rutina}`);
      setAviso({ tipo: 'ok', texto: data.mensaje });
      await cargarRutina(idAlumno);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  // Ejercicios agrupados por grupo muscular para el desplegable
  const grupos = ejercicios.reduce((acc, e) => {
    (acc[e.grupo_muscular] = acc[e.grupo_muscular] || []).push(e);
    return acc;
  }, {});

  const filas = dias[diaActivo];

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Rutinas</h2>
        <p className="seccion__ayuda">
          Elegí un alumno para ver o armar su rutina. Cada rutina tiene 3 días con hasta 8 ejercicios por día,
          elegidos del catálogo de la pestaña Ejercicios.
        </p>

        <div className="form form--compacto" style={{ marginBottom: 20 }}>
          <label className="campo">
            Alumno
            <select value={idAlumno} onChange={(e) => cargarRutina(e.target.value)}>
              <option value="">Elegí un alumno</option>
              {alumnos.map((a) => (
                <option key={a.id_usuario} value={a.id_usuario}>{a.apellido}, {a.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        {cargandoRutina && <p className="cargando">Cargando…</p>}

        {idAlumno && !cargandoRutina && (
          <>
            <p className="seccion__ayuda">
              {rutina
                ? `Rutina actual${rutina.creada_por ? `, armada por ${rutina.creada_por}` : ''}.`
                : 'Este alumno no tiene rutina. Cargá los ejercicios y guardala.'}
            </p>

            <div className="form form--compacto" style={{ marginBottom: 16 }}>
              <label className="campo">
                Nombre de la rutina (opcional)
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Rutina de inicio" />
              </label>
            </div>

            <div className="panel__tabs" role="tablist" aria-label="Días de la rutina">
              {DIAS.map((dia) => (
                <button
                  key={dia}
                  type="button"
                  role="tab"
                  aria-selected={dia === diaActivo}
                  className={`panel__tab${dia === diaActivo ? ' is-active' : ''}`}
                  onClick={() => setDiaActivo(dia)}
                >
                  Día {dia} ({dias[dia].length})
                </button>
              ))}
            </div>

            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ejercicio</th>
                    <th>Series</th>
                    <th>Repeticiones</th>
                    <th>Peso (kg)</th>
                    <th>Observaciones</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="tabla__vacia">Sin ejercicios en este día.</td>
                    </tr>
                  )}
                  {filas.map((f, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <select
                          className="input-tabla"
                          value={f.id_ejercicio}
                          onChange={(e) => cambiarFila(diaActivo, i, 'id_ejercicio', e.target.value)}
                          aria-label="Ejercicio"
                        >
                          <option value="">Elegí un ejercicio</option>
                          {Object.entries(grupos).map(([grupo, lista]) => (
                            <optgroup key={grupo} label={grupo}>
                              {lista.map((e) => (
                                <option key={e.id_ejercicio} value={e.id_ejercicio}>{e.nombre}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="input-tabla" type="number" min="1" style={{ maxWidth: 70 }}
                          value={f.series} onChange={(e) => cambiarFila(diaActivo, i, 'series', e.target.value)} aria-label="Series" />
                      </td>
                      <td>
                        <input className="input-tabla" type="number" min="1" style={{ maxWidth: 70 }}
                          value={f.repeticiones} onChange={(e) => cambiarFila(diaActivo, i, 'repeticiones', e.target.value)} aria-label="Repeticiones" />
                      </td>
                      <td>
                        <input className="input-tabla" type="number" min="0" step="0.5" style={{ maxWidth: 80 }} placeholder="-"
                          value={f.peso_kg} onChange={(e) => cambiarFila(diaActivo, i, 'peso_kg', e.target.value)} aria-label="Peso" />
                      </td>
                      <td>
                        <input className="input-tabla" value={f.observaciones}
                          onChange={(e) => cambiarFila(diaActivo, i, 'observaciones', e.target.value)} aria-label="Observaciones" />
                      </td>
                      <td>
                        <div className="tabla__acciones">
                          <button type="button" className="btn btn--chico btn--secundario" onClick={() => moverFila(diaActivo, i, -1)} aria-label="Subir">↑</button>
                          <button type="button" className="btn btn--chico btn--secundario" onClick={() => moverFila(diaActivo, i, 1)} aria-label="Bajar">↓</button>
                          <button type="button" className="btn btn--chico btn--peligro" onClick={() => quitarFila(diaActivo, i)}>Quitar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form__acciones" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn--secundario"
                onClick={() => agregarFila(diaActivo)}
                disabled={filas.length >= MAX_EJERCICIOS}
              >
                {filas.length >= MAX_EJERCICIOS ? 'Máximo de 8 ejercicios' : 'Agregar ejercicio'}
              </button>
              <button type="button" className="btn" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar rutina'}
              </button>
              {rutina && (
                <button type="button" className="btn btn--peligro" onClick={darDeBaja}>Dar de baja</button>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}