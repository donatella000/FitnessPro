import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from './Aviso';
import { iconoAchicado } from '../../utils/imagenes';
import { iconoDeActividad } from '../../utils/iconosActividad';

const FORM_VACIO = { nombre: '', tipo: 'clase', descripcion: '', icono: null };

// Vista previa del ícono sobre el banderín negro, como se ve en la portada
function MuestraIcono({ src }) {
  return (
    <span className="icono-actividad" aria-hidden="true">
      {src ? <img src={src} alt="" /> : <span className="icono-actividad__vacio">Sin ícono</span>}
    </span>
  );
}

// Lee el archivo elegido y lo achica; devuelve null si no es válido
async function prepararIcono(e, setAviso) {
  const archivo = e.target.files?.[0];
  e.target.value = '';
  if (!archivo) return null;
  if (!['image/png', 'image/svg+xml', 'image/webp'].includes(archivo.type)) {
    setAviso({ tipo: 'error', texto: 'El ícono tiene que ser PNG, SVG o WEBP con fondo transparente.' });
    return null;
  }
  try {
    return await iconoAchicado(archivo);
  } catch (error) {
    setAviso({ tipo: 'error', texto: error.message });
    return null;
  }
}

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
      await api.post('/clases/actividades', { ...form, icono: form.icono || undefined });
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

  const cambiarIcono = async (actividad, icono) => {
    try {
      const { data } = await api.put(`/clases/actividades/${actividad.id_actividad}`, { icono });
      setAviso({ tipo: 'ok', texto: data.mensaje });
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
          <div className="campo campo--ancho">
            Ícono para la portada
            <div className="icono-carga">
              <MuestraIcono src={form.icono || iconoDeActividad({ nombre: form.nombre, tipo: form.tipo })} />
              <label className="btn btn--secundario btn--chico">
                Elegir imagen
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/webp"
                  hidden
                  onChange={async (e) => {
                    const icono = await prepararIcono(e, setAviso);
                    if (icono) setForm((f) => ({ ...f, icono }));
                  }}
                />
              </label>
              {form.icono && (
                <button type="button" className="btn btn--chico btn--secundario" onClick={() => setForm((f) => ({ ...f, icono: null }))}>
                  Quitar
                </button>
              )}
              <span className="campo__nota">
                Conviene una imagen blanca con fondo transparente (PNG), porque se muestra sobre el banderín negro.
                Si no cargás ninguna, Musculación, Yoga, Pilates y Spinning usan su ícono incluido.
              </span>
            </div>
          </div>
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
                  <th>Ícono</th>
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
                    <td colSpan={6} className="tabla__vacia">Todavía no hay actividades. Creá la primera arriba.</td>
                  </tr>
                )}

                {actividades.map((a) =>
                  editando?.id_actividad === a.id_actividad ? (
                    <tr key={a.id_actividad}>
                      <td><MuestraIcono src={iconoDeActividad(a)} /></td>
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
                      <td>
                        <div className="icono-celda">
                          <MuestraIcono src={iconoDeActividad(a)} />
                          <label className="btn-link">
                            Cambiar
                            <input
                              type="file"
                              accept="image/png,image/svg+xml,image/webp"
                              hidden
                              onChange={async (e) => {
                                const icono = await prepararIcono(e, setAviso);
                                if (icono) cambiarIcono(a, icono);
                              }}
                            />
                          </label>
                          {a.icono && (
                            <button type="button" className="btn-link" onClick={() => cambiarIcono(a, null)}>
                              Original
                            </button>
                          )}
                        </div>
                      </td>
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
