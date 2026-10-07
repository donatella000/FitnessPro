import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha, formatearPrecio } from '../../utils/formato';
import Aviso from './Aviso';

const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mercadopago: 'Mercado Pago' };
const FORM_VACIO = { id_usuario: '', id_suscripcion: '', metodo_pago: 'efectivo', recargo: '' };

// Cobro presencial (Admin y Profesor) e historial de pagos.
// Solo el Admin puede anular un pago cargado por error.
export default function CobrosGestion({ esAdmin }) {
  const [alumnos, setAlumnos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [filtroAlumno, setFiltroAlumno] = useState('');

  const cargarPagos = useCallback(async () => {
    try {
      const params = filtroAlumno ? { id_usuario: filtroAlumno } : {};
      const { data } = await api.get('/pagos', { params });
      setPagos(data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  }, [filtroAlumno]);

  useEffect(() => {
    Promise.all([api.get('/usuarios', { params: { rol: 3 } }), api.get('/suscripciones')])
      .then(([rAlumnos, rPlanes]) => {
        setAlumnos(rAlumnos.data);
        setPlanes(rPlanes.data);
      })
      .catch((error) => setAviso({ tipo: 'error', texto: mensajeDeError(error) }))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const cobrar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const { data } = await api.post('/pagos', {
        id_usuario: Number(form.id_usuario),
        id_suscripcion: Number(form.id_suscripcion),
        metodo_pago: form.metodo_pago,
        recargo: form.recargo ? Number(form.recargo) : 0,
      });
      const p = data.pago;
      setAviso({
        tipo: 'ok',
        texto: `Cobro registrado: ${p.suscripcion} para ${p.nombre} ${p.apellido}, válido desde ${formatearFecha(p.fecha_inicio)} hasta ${formatearFecha(p.vencimiento)}.`,
      });
      setForm(FORM_VACIO);
      cargarPagos();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const anular = async (pago) => {
    const confirmado = window.confirm(
      `¿Anular el pago de ${pago.nombre} ${pago.apellido} (${pago.suscripcion})? También se elimina el abono que generó.`
    );
    if (!confirmado) return;
    try {
      const { data } = await api.delete(`/pagos/${pago.id_pago}`);
      setAviso({ tipo: 'ok', texto: data.mensaje });
      cargarPagos();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  };

  if (cargando) return <p className="cargando">Cargando…</p>;

  const plan = planes.find((p) => String(p.id_suscripcion) === form.id_suscripcion);
  const total = plan ? Number(plan.precio) + (Number(form.recargo) || 0) : 0;

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Cobro en el gimnasio</h2>
        <p className="seccion__ayuda">
          El abono queda activo en el momento. Si el alumno ya tiene uno vigente de la misma actividad,
          el nuevo empieza al día siguiente del vencimiento.
        </p>

        <form className="form" onSubmit={cobrar}>
          <label className="campo">
            Alumno
            <select name="id_usuario" value={form.id_usuario} onChange={cambiar} required>
              <option value="">Elegí un alumno</option>
              {alumnos.map((a) => (
                <option key={a.id_usuario} value={a.id_usuario}>{a.apellido}, {a.nombre} ({a.dni})</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Plan
            <select name="id_suscripcion" value={form.id_suscripcion} onChange={cambiar} required>
              <option value="">Elegí un plan</option>
              {planes.map((p) => (
                <option key={p.id_suscripcion} value={p.id_suscripcion}>{p.nombre} ({formatearPrecio(p.precio)})</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Medio de pago
            <select name="metodo_pago" value={form.metodo_pago} onChange={cambiar}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>
          <label className="campo">
            Recargo (opcional)
            <input name="recargo" type="number" min="0" value={form.recargo} onChange={cambiar} placeholder="0" />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn" disabled={guardando}>
              {guardando ? 'Registrando…' : `Cobrar${plan ? ` ${formatearPrecio(total)}` : ''}`}
            </button>
          </div>
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Pagos</h2>

        <div className="form form--compacto" style={{ marginBottom: 16 }}>
          <label className="campo">
            Filtrar por alumno
            <select value={filtroAlumno} onChange={(e) => setFiltroAlumno(e.target.value)}>
              <option value="">Todos</option>
              {alumnos.map((a) => (
                <option key={a.id_usuario} value={a.id_usuario}>{a.apellido}, {a.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Alumno</th>
                <th>Plan</th>
                <th>Vigencia</th>
                <th>Total</th>
                <th>Medio</th>
                <th>Estado</th>
                {esAdmin && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} className="tabla__vacia">No hay pagos registrados.</td>
                </tr>
              )}
              {pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td>{formatearFecha(p.fecha_pago)}</td>
                  <td>{p.apellido}, {p.nombre}</td>
                  <td>{p.suscripcion}</td>
                  <td>{p.fecha_inicio ? `${formatearFecha(p.fecha_inicio)} a ${formatearFecha(p.vencimiento)}` : '-'}</td>
                  <td>{formatearPrecio(p.total)}</td>
                  <td>{METODOS[p.metodo_pago] || p.metodo_pago}</td>
                  <td>
                    <span className={`estado${p.estado === 'aprobado' ? '' : ' estado--off'}`}>
                      {p.estado === 'aprobado' ? 'Aprobado' : p.estado === 'pendiente' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </td>
                  {esAdmin && (
                    <td>
                      <div className="tabla__acciones">
                        <button type="button" className="btn btn--chico btn--peligro" onClick={() => anular(p)}>
                          Anular
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}