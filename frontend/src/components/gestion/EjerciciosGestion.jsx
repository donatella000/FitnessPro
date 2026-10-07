import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from './Aviso';

const FORM_VACIO = { nombre: '', grupo_muscular: '', descripcion: '' };

// Catálogo de ejercicios que se usan para armar las rutinas (Admin y Profesor)
export default function EjerciciosGestion() {
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState(null); // { id_ejercicio, nombre, grupo_muscular }

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/rutinas/ejercicios', { params: { incluirInactivos: 1 } });
      setEjercicios(data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = async (accion, mensaje) => {
    setAviso(null);
    try {
      const { data } = await accion();
      setAviso({ tipo: 'ok', texto: mensaje || data.mensaje });
      await cargar();
      return true;
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
      return false;
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => api.post('/rutinas/ejercicios', form));
    if (ok) setForm((f) => ({ ...FORM_VACIO, grupo_muscular: f.grupo_muscular }));
  };

  const guardarEdicion = async () => {
    const { id_ejercicio, ...datos } = editando;
    const ok = await ejecutar(() => api.put(`/rutinas/ejercicios/${id_ejercicio}`, datos));
    if (ok) setEditando(null);
  };

  // Grupos ya usados, para sugerirlos al escribir
  const gruposExistentes = [...new Set(ejercicios.map((e) => e.grupo_muscular))].sort();

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Nuevo ejercicio</h2>
        <form className="form" onSubmit={crear}>
          <label className="campo">
            Nombre
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej.: Sentadilla con barra" required />
          </label>
          <label className="campo">
            Grupo muscular
            <input
              list="grupos-musculares"
              value={form.grupo_muscular}
              onChange={(e) => setForm((f) => ({ ...f, grupo_muscular: e.target.value }))}
              placeholder="Ej.: Piernas"
              required
            />
            <datalist id="grupos-musculares">
              {gruposExistentes.map((g) => <option key={g} value={g} />)}
            </datalist>
          </label>
          <label className="campo campo--ancho">
            Descripción (opcional)
            <input value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn">Agregar ejercicio</button>
          </div>
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Catálogo de ejercicios</h2>
        <p className="seccion__ayuda">
          Un ejercicio dado de baja deja de aparecer para rutinas nuevas, pero las rutinas que ya lo incluyen no cambian.
        </p>

        {cargando ? (
          <p className="cargando">Cargando…</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th>Grupo muscular</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {ejercicios.length === 0 && (
                  <tr>
                    <td colSpan={4} className="tabla__vacia">Todavía no hay ejercicios cargados.</td>
                  </tr>
                )}
                {ejercicios.map((e) => {
                  const enEdicion = editando?.id_ejercicio === e.id_ejercicio;
                  return (
                    <tr key={e.id_ejercicio} className={e.activo ? '' : 'is-inactivo'}>
                      <td>
                        {enEdicion ? (
                          <input className="input-tabla" value={editando.nombre}
                            onChange={(ev) => setEditando((d) => ({ ...d, nombre: ev.target.value }))} aria-label="Nombre" />
                        ) : e.nombre}
                      </td>
                      <td>
                        {enEdicion ? (
                          <input className="input-tabla" list="grupos-musculares" value={editando.grupo_muscular}
                            onChange={(ev) => setEditando((d) => ({ ...d, grupo_muscular: ev.target.value }))} aria-label="Grupo muscular" />
                        ) : e.grupo_muscular}
                      </td>
                      <td>
                        <span className={`estado${e.activo ? '' : ' estado--off'}`}>{e.activo ? 'Activo' : 'De baja'}</span>
                      </td>
                      <td>
                        <div className="tabla__acciones">
                          {enEdicion ? (
                            <>
                              <button type="button" className="btn btn--chico" onClick={guardarEdicion}>Guardar</button>
                              <button type="button" className="btn btn--chico btn--secundario" onClick={() => setEditando(null)}>Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn--chico btn--secundario"
                                onClick={() => setEditando({ id_ejercicio: e.id_ejercicio, nombre: e.nombre, grupo_muscular: e.grupo_muscular })}
                              >
                                Editar
                              </button>
                              {e.activo ? (
                                <button type="button" className="btn btn--chico btn--peligro"
                                  onClick={() => ejecutar(() => api.delete(`/rutinas/ejercicios/${e.id_ejercicio}`))}>
                                  Dar de baja
                                </button>
                              ) : (
                                <button type="button" className="btn btn--chico btn--secundario"
                                  onClick={() => ejecutar(() => api.put(`/rutinas/ejercicios/${e.id_ejercicio}`, { activo: 1 }), 'Ejercicio reactivado.')}>
                                  Reactivar
                                </button>
                              )}
                            </>
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
    </>
  );
}