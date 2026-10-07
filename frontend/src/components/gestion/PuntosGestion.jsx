import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha } from '../../utils/formato';
import Aviso from './Aviso';

const PREMIO_VACIO = { nombre: '', descripcion: '', valor_puntos: '', stock: '' };
const AJUSTE_VACIO = { id_usuario: '', cantidad: '', descripcion: '' };

// Premios, canjes pendientes de entrega y ajustes manuales de puntos (Admin y Profesor)
export default function PuntosGestion() {
  const [premios, setPremios] = useState([]);
  const [canjes, setCanjes] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const [premio, setPremio] = useState(PREMIO_VACIO);
  const [ajuste, setAjuste] = useState(AJUSTE_VACIO);
  const [editando, setEditando] = useState(null); // { id_premio, valor_puntos, stock }

  const cargar = useCallback(async () => {
    try {
      const [rPremios, rCanjes, rAlumnos] = await Promise.all([
        api.get('/puntos/catalogo', { params: { incluirInactivos: 1 } }),
        api.get('/puntos/canjes', { params: { estado: 'pendiente' } }),
        api.get('/usuarios', { params: { rol: 3 } }),
      ]);
      setPremios(rPremios.data);
      setCanjes(rCanjes.data);
      setAlumnos(rAlumnos.data);
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

  const crearPremio = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => api.post('/puntos/catalogo', {
      nombre: premio.nombre.trim(),
      descripcion: premio.descripcion.trim() || null,
      valor_puntos: Number(premio.valor_puntos),
      stock: premio.stock === '' ? null : Number(premio.stock),
    }));
    if (ok) setPremio(PREMIO_VACIO);
  };

  const guardarEdicion = async () => {
    const ok = await ejecutar(() => api.put(`/puntos/catalogo/${editando.id_premio}`, {
      valor_puntos: Number(editando.valor_puntos),
      stock: editando.stock,
    }), 'Premio actualizado.');
    if (ok) setEditando(null);
  };

  const ajustar = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => api.post('/puntos/ajustar', {
      id_usuario: Number(ajuste.id_usuario),
      cantidad: Number(ajuste.cantidad),
      descripcion: ajuste.descripcion,
    }));
    if (ok) setAjuste(AJUSTE_VACIO);
  };

  if (cargando) return <p className="cargando">Cargando…</p>;

  const alumnoAjuste = alumnos.find((a) => String(a.id_usuario) === ajuste.id_usuario);

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="seccion">
        <h2 className="seccion__titulo">Canjes para entregar</h2>
        {canjes.length === 0 ? (
          <p className="seccion__ayuda">No hay canjes pendientes de entrega.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
                  <th>DNI</th>
                  <th>Premio</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {canjes.map((c) => (
                  <tr key={c.id_canje}>
                    <td>{formatearFecha(c.fecha)}</td>
                    <td>{c.apellido}, {c.nombre}</td>
                    <td>{c.dni}</td>
                    <td>{c.premio}</td>
                    <td>
                      <div className="tabla__acciones">
                        <button type="button" className="btn btn--chico"
                          onClick={() => ejecutar(() => api.put(`/puntos/canjes/${c.id_canje}/entregar`))}>
                          Marcar entregado
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Nuevo premio</h2>
        <form className="form" onSubmit={crearPremio}>
          <label className="campo">
            Nombre
            <input value={premio.nombre} onChange={(e) => setPremio((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej.: Remera FitnessPro" required />
          </label>
          <label className="campo">
            Valor en puntos
            <input type="number" min="1" value={premio.valor_puntos} onChange={(e) => setPremio((p) => ({ ...p, valor_puntos: e.target.value }))} required />
          </label>
          <label className="campo">
            Stock
            <input type="number" min="0" value={premio.stock} onChange={(e) => setPremio((p) => ({ ...p, stock: e.target.value }))} placeholder="Vacío = ilimitado" />
          </label>
          <label className="campo campo--ancho">
            Descripción (opcional)
            <input value={premio.descripcion} onChange={(e) => setPremio((p) => ({ ...p, descripcion: e.target.value }))} />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn">Crear premio</button>
          </div>
        </form>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Catálogo de premios</h2>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Premio</th>
                <th>Puntos</th>
                <th>Stock</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {premios.length === 0 && (
                <tr>
                  <td colSpan={5} className="tabla__vacia">Todavía no hay premios.</td>
                </tr>
              )}
              {premios.map((p) => {
                const enEdicion = editando?.id_premio === p.id_premio;
                return (
                  <tr key={p.id_premio} className={p.activo ? '' : 'is-inactivo'}>
                    <td>
                      {p.nombre}
                      {p.descripcion && <div className="tabla__detalle">{p.descripcion}</div>}
                    </td>
                    <td>
                      {enEdicion ? (
                        <input className="input-tabla" type="number" min="1" style={{ maxWidth: 100 }} value={editando.valor_puntos}
                          onChange={(e) => setEditando((d) => ({ ...d, valor_puntos: e.target.value }))} aria-label="Puntos" />
                      ) : p.valor_puntos}
                    </td>
                    <td>
                      {enEdicion ? (
                        <input className="input-tabla" type="number" min="0" style={{ maxWidth: 100 }} value={editando.stock} placeholder="Ilimitado"
                          onChange={(e) => setEditando((d) => ({ ...d, stock: e.target.value }))} aria-label="Stock" />
                      ) : p.stock === null ? 'Ilimitado' : p.stock}
                    </td>
                    <td>
                      <span className={`estado${p.activo ? '' : ' estado--off'}`}>{p.activo ? 'Disponible' : 'De baja'}</span>
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
                              onClick={() => setEditando({
                                id_premio: p.id_premio, valor_puntos: String(p.valor_puntos), stock: p.stock === null ? '' : String(p.stock),
                              })}
                            >
                              Editar
                            </button>
                            {p.activo ? (
                              <button type="button" className="btn btn--chico btn--peligro"
                                onClick={() => ejecutar(() => api.delete(`/puntos/catalogo/${p.id_premio}`))}>
                                Dar de baja
                              </button>
                            ) : (
                              <button type="button" className="btn btn--chico btn--secundario"
                                onClick={() => ejecutar(() => api.put(`/puntos/catalogo/${p.id_premio}`, { activo: 1 }), 'Premio reactivado.')}>
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
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Ajuste manual de puntos</h2>
        <p className="seccion__ayuda">
          Una cantidad positiva suma y una negativa resta. El motivo queda registrado en el historial del alumno.
        </p>
        <form className="form" onSubmit={ajustar}>
          <label className="campo">
            Alumno
            <select value={ajuste.id_usuario} onChange={(e) => setAjuste((a) => ({ ...a, id_usuario: e.target.value }))} required>
              <option value="">Elegí un alumno</option>
              {alumnos.map((a) => (
                <option key={a.id_usuario} value={a.id_usuario}>{a.apellido}, {a.nombre} ({a.puntos} puntos)</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Cantidad
            <input type="number" step="1" value={ajuste.cantidad} onChange={(e) => setAjuste((a) => ({ ...a, cantidad: e.target.value }))} placeholder="Ej.: 500 o -200" required />
          </label>
          <label className="campo">
            Motivo
            <input value={ajuste.descripcion} onChange={(e) => setAjuste((a) => ({ ...a, descripcion: e.target.value }))} placeholder="Ej.: Promoción de cumpleaños" required />
          </label>
          <div className="form__acciones">
            <button type="submit" className="btn">Aplicar ajuste</button>
          </div>
          {alumnoAjuste && ajuste.cantidad && (
            <p className="form__nota">
              Saldo actual: {alumnoAjuste.puntos}. Saldo después del ajuste: {alumnoAjuste.puntos + Number(ajuste.cantidad)}.
            </p>
          )}
        </form>
      </section>
    </>
  );
}