import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from './Aviso';

const FORM_VACIO = { nombre: '', tipo: 'clase', descripcion: '' };

// Solo Admin. Primer paso para armar el gimnasio.
export default function ActividadesGestion() {
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null); // { id_actividad, nombre, descripcion }

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/clases/actividades', { params: { incluirInactivas: 1 } });
      setActividades(data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarForm = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      await api.post('/clases/actividades', form);
      setAviso({
        tipo: 'ok',
        texto: form.tipo === 'musculacion'
          ? `Actividad "${form.nombre}" creada. Ahora generá sus horarios en la pestaña Clases y horarios.`
          : `Actividad "${form.nombre}" creada. Ahora creá sus clases asignando profesores en la pestaña Clases y horarios.`,
      });
      setForm(FORM_VACIO);
      cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async () => {
    try {
      const { id_actividad, ...datos } = editando;
      await api.put(`/clases/actividades/${id_actividad}`, datos);
      setAviso({ tipo: 'ok', texto: 'Actividad actualizada.' });
      setEditando(null);
      cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  const cambiarEstado = async (actividad) => {
    try {
      if (actividad.activo) {
        const { data } = await api.delete(`/clases/actividades/${actividad.id_actividad}`);
        setAviso({ tipo: 'ok', texto: data.mensaje });
      } else {
        await api.put(`/clases/actividades/${actividad.id_actividad}`, { activo: 1 });
        setAviso({
          tipo: 'ok',
          texto: 'Actividad reactivada. Sus clases, horarios y suscripciones anteriores siguen dados de baja: cargalos de nuevo.',
        });
      }
      cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Nueva actividad</h2>
        <p className="seccion__ayuda">
          Elegí "Turnos libres por hora" para musculación: no se elige profesor y el alumno reserva
          cualquier horario. Elegí "Clase con profesor" para yoga, pilates, spinning y similares.
        </p>

        <form className="form" onSubmit={crear}>
          <label className="campo">
            Nombre
            <input name="nombre" value={form.nombre} onChange={cambiarForm} placeholder="Ej.: Yoga" required />
          </label>
          <label className="campo">
            Tipo
            <select name="tipo" value={form.tipo} onChange={cambiarForm}>
              <option value="clase">Clase con profesor</option>
              <option value="musculacion">Turnos libres por hora</option>
            </select>
          </label>
          <label className="campo campo--ancho">
            Descripción (opcional)
            <textarea name="descripcion" value={form.descripcion} onChange={cambiarForm} />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn" disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear actividad'}
            </button>
          </div>
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Actividades</h2>

        {cargando ? (
          <p className="cargando">Cargando…</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {actividades.length === 0 && (
                  <tr>
                    <td colSpan={5} className="tabla__vacia">Todavía no hay actividades. Creá la primera arriba.</td>
                  </tr>
                )}

                {actividades.map((a) =>
                  editando?.id_actividad === a.id_actividad ? (
                    <tr key={a.id_actividad}>
                      <td>
                        <input
                          className="input-tabla"
                          value={editando.nombre}
                          onChange={(e) => setEditando((d) => ({ ...d, nombre: e.target.value }))}
                          aria-label="Nombre"
                        />
                      </td>
                      <td>{a.tipo === 'musculacion' ? 'Turnos libres' : 'Clase con profesor'}</td>
                      <td>
                        <input
                          className="input-tabla"
                          value={editando.descripcion}
                          onChange={(e) => setEditando((d) => ({ ...d, descripcion: e.target.value }))}
                          aria-label="Descripción"
                        />
                      </td>
                      <td />
                      <td>
                        <div className="tabla__acciones">
                          <button type="button" className="btn btn--chico" onClick={guardarEdicion}>Guardar</button>
                          <button type="button" className="btn btn--chico btn--secundario" onClick={() => setEditando(null)}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id_actividad} className={a.activo ? '' : 'is-inactivo'}>
                      <td>{a.nombre}</td>
                      <td>{a.tipo === 'musculacion' ? 'Turnos libres' : 'Clase con profesor'}</td>
                      <td>{a.descripcion || '-'}</td>
                      <td>
                        <span className={`estado${a.activo ? '' : ' estado--off'}`}>
                          {a.activo ? 'Activa' : 'De baja'}
                        </span>
                      </td>
                      <td>
                        <div className="tabla__acciones">
                          <button
                            type="button"
                            className="btn btn--chico btn--secundario"
                            onClick={() => setEditando({
                              id_actividad: a.id_actividad, nombre: a.nombre, descripcion: a.descripcion || '',
                            })}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`btn btn--chico ${a.activo ? 'btn--peligro' : 'btn--secundario'}`}
                            onClick={() => cambiarEstado(a)}
                          >
                            {a.activo ? 'Dar de baja' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}