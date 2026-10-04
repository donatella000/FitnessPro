import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearPrecio } from '../../utils/formato';
import Aviso from './Aviso';

const ESTANDAR_VACIO = { id_actividad: '', veces_por_semana: '3', precio_mensual: '' };
const MEDIDA_VACIO = {
  id_actividad: '', nombre: '', duracion_dias: '30', veces_por_semana: '3', cantidad_turnos: '', precio: '',
};

// Misma cuenta que hace el backend, para mostrar la vista previa
const turnosDelPlan = (veces, dias) => Number(veces) * 4 * Math.round(Number(dias) / 30);

// Solo Admin
export default function SuscripcionesGestion() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const [estandar, setEstandar] = useState(ESTANDAR_VACIO);
  const [medida, setMedida] = useState(MEDIDA_VACIO);
  const [editandoPrecio, setEditandoPrecio] = useState(null); // { id_suscripcion, precio }

  const cargar = useCallback(async () => {
    try {
      const [rSus, rAct] = await Promise.all([
        api.get('/suscripciones', { params: { incluirInactivas: 1 } }),
        api.get('/clases/actividades'),
      ]);
      setSuscripciones(rSus.data);
      setActividades(rAct.data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = async (accion) => {
    setAviso(null);
    try {
      const { data } = await accion();
      setAviso({ tipo: 'ok', texto: data.mensaje });
      await cargar();
      return true;
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
      return false;
    }
  };

  const crearEstandar = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => api.post('/suscripciones/generar-planes', {
      id_actividad: Number(estandar.id_actividad),
      veces_por_semana: Number(estandar.veces_por_semana),
      precio_mensual: Number(estandar.precio_mensual),
    }));
    if (ok) setEstandar(ESTANDAR_VACIO);
  };

  const crearMedida = async (e) => {
    e.preventDefault();
    const cuerpo = {
      id_actividad: Number(medida.id_actividad),
      nombre: medida.nombre.trim(),
      duracion_dias: Number(medida.duracion_dias),
      veces_por_semana: Number(medida.veces_por_semana),
      precio: Number(medida.precio),
    };
    if (medida.cantidad_turnos) cuerpo.cantidad_turnos = Number(medida.cantidad_turnos);

    const ok = await ejecutar(() => api.post('/suscripciones', cuerpo));
    if (ok) setMedida(MEDIDA_VACIO);
  };

  const guardarPrecio = async () => {
    const ok = await ejecutar(() => api.put(`/suscripciones/${editandoPrecio.id_suscripcion}`, {
      precio: Number(editandoPrecio.precio),
    }));
    if (ok) setEditandoPrecio(null);
  };

  const cambiarEstado = (s) => ejecutar(() => (
    s.activo
      ? api.delete(`/suscripciones/${s.id_suscripcion}`)
      : api.put(`/suscripciones/${s.id_suscripcion}`, { activo: 1 })
  ));

  const mensual = Number(estandar.precio_mensual) || 0;
  const vistaPrevia = mensual > 0 && [
    { plan: 'Mensual', precio: mensual, turnos: turnosDelPlan(estandar.veces_por_semana, 30) },
    { plan: 'Semestral', precio: Math.round(mensual * 6 * 0.8), turnos: turnosDelPlan(estandar.veces_por_semana, 180) },
    { plan: 'Anual', precio: Math.round(mensual * 12 * 0.7), turnos: turnosDelPlan(estandar.veces_por_semana, 360) },
  ];

  if (cargando) return <p className="cargando">Cargando…</p>;

  if (actividades.length === 0) {
    return (
      <p className="seccion__ayuda">
        Para crear suscripciones, primero creá al menos una actividad en la pestaña Actividades.
      </p>
    );
  }

  const opcionesActividad = actividades.map((a) => (
    <option key={a.id_actividad} value={a.id_actividad}>{a.nombre}</option>
  ));

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Planes estándar</h2>
        <p className="seccion__ayuda">
          Con el precio mensual se crean los tres planes de una vez: mensual, semestral con 20% de
          descuento y anual con 30% de descuento.
        </p>

        <form className="form" onSubmit={crearEstandar}>
          <label className="campo">
            Actividad
            <select value={estandar.id_actividad} onChange={(e) => setEstandar((f) => ({ ...f, id_actividad: e.target.value }))} required>
              <option value="">Elegí una actividad</option>
              {opcionesActividad}
            </select>
          </label>
          <label className="campo">
            Veces por semana
            <input type="number" min="1" max="7" value={estandar.veces_por_semana} onChange={(e) => setEstandar((f) => ({ ...f, veces_por_semana: e.target.value }))} required />
          </label>
          <label className="campo">
            Precio mensual
            <input type="number" min="1" value={estandar.precio_mensual} onChange={(e) => setEstandar((f) => ({ ...f, precio_mensual: e.target.value }))} required />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn">Crear los 3 planes</button>
          </div>

          {vistaPrevia && (
            <p className="form__nota">
              {vistaPrevia.map((v) => `${v.plan}: ${formatearPrecio(v.precio)} (${v.turnos} turnos)`).join('. ')}.
            </p>
          )}
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Plan a medida</h2>
        <p className="seccion__ayuda">
          Para promociones u otras duraciones. Si dejás vacía la cantidad de turnos, se calcula según
          las veces por semana y la duración.
        </p>

        <form className="form" onSubmit={crearMedida}>
          <label className="campo">
            Actividad
            <select value={medida.id_actividad} onChange={(e) => setMedida((f) => ({ ...f, id_actividad: e.target.value }))} required>
              <option value="">Elegí una actividad</option>
              {opcionesActividad}
            </select>
          </label>
          <label className="campo">
            Nombre
            <input value={medida.nombre} onChange={(e) => setMedida((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej.: Yoga trimestral 2x semana" required />
          </label>
          <label className="campo">
            Duración (días)
            <input type="number" min="1" value={medida.duracion_dias} onChange={(e) => setMedida((f) => ({ ...f, duracion_dias: e.target.value }))} required />
          </label>
          <label className="campo">
            Veces por semana
            <input type="number" min="1" max="7" value={medida.veces_por_semana} onChange={(e) => setMedida((f) => ({ ...f, veces_por_semana: e.target.value }))} required />
          </label>
          <label className="campo">
            Cantidad de turnos
            <input type="number" min="1" value={medida.cantidad_turnos} onChange={(e) => setMedida((f) => ({ ...f, cantidad_turnos: e.target.value }))} placeholder="Automático" />
          </label>
          <label className="campo">
            Precio
            <input type="number" min="0" value={medida.precio} onChange={(e) => setMedida((f) => ({ ...f, precio: e.target.value }))} required />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn">Crear plan</button>
          </div>
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Suscripciones</h2>
        <p className="seccion__ayuda">
          Cambiar el precio o dar de baja un plan no afecta a los alumnos que ya lo pagaron.
        </p>

        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Plan</th>
                <th>Duración</th>
                <th>Por semana</th>
                <th>Turnos</th>
                <th>Precio</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {suscripciones.length === 0 && (
                <tr>
                  <td colSpan={8} className="tabla__vacia">Todavía no hay suscripciones. Creá las primeras arriba.</td>
                </tr>
              )}

              {suscripciones.map((s) => {
                const editando = editandoPrecio?.id_suscripcion === s.id_suscripcion;
                return (
                  <tr key={s.id_suscripcion} className={s.activo ? '' : 'is-inactivo'}>
                    <td>{s.actividad}</td>
                    <td>{s.nombre}</td>
                    <td>{s.duracion_dias} días</td>
                    <td>{s.veces_por_semana}</td>
                    <td>{s.cantidad_turnos}</td>
                    <td>
                      {editando ? (
                        <input
                          className="input-tabla"
                          type="number"
                          min="0"
                          style={{ maxWidth: 120 }}
                          value={editandoPrecio.precio}
                          onChange={(e) => setEditandoPrecio((p) => ({ ...p, precio: e.target.value }))}
                          aria-label="Precio"
                        />
                      ) : (
                        formatearPrecio(s.precio)
                      )}
                    </td>
                    <td>
                      <span className={`estado${s.activo ? '' : ' estado--off'}`}>
                        {s.activo ? 'A la venta' : 'De baja'}
                      </span>
                    </td>
                    <td>
                      <div className="tabla__acciones">
                        {editando ? (
                          <>
                            <button type="button" className="btn btn--chico" onClick={guardarPrecio}>Guardar</button>
                            <button type="button" className="btn btn--chico btn--secundario" onClick={() => setEditandoPrecio(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--chico btn--secundario"
                              onClick={() => setEditandoPrecio({ id_suscripcion: s.id_suscripcion, precio: String(Math.round(s.precio)) })}
                            >
                              Cambiar precio
                            </button>
                            <button
                              type="button"
                              className={`btn btn--chico ${s.activo ? 'btn--peligro' : 'btn--secundario'}`}
                              onClick={() => cambiarEstado(s)}
                            >
                              {s.activo ? 'Dar de baja' : 'Reactivar'}
                            </button>
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
      </section>
    </>
  );
}