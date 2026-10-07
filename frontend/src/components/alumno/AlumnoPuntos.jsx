import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha } from '../../utils/formato';
import Aviso from '../gestion/Aviso';

// Saldo de puntos, catálogo de premios y canjes del alumno
export default function AlumnoPuntos() {
  const [saldo, setSaldo] = useState(null);
  const [premios, setPremios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [canjeando, setCanjeando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [rSaldo, rPremios] = await Promise.all([
        api.get('/puntos/mi-saldo'),
        api.get('/puntos/catalogo'),
      ]);
      setSaldo(rSaldo.data);
      setPremios(rPremios.data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="dash__status">Cargando tus puntos…</p>;
  if (!saldo) return <Aviso aviso={aviso} />;

  const canjear = async () => {
    setCanjeando(true);
    setAviso(null);
    try {
      const { data } = await api.post('/puntos/canjear', { id_premio: elegido.id_premio });
      setAviso({ tipo: 'ok', texto: data.mensaje });
      setElegido(null);
      await cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCanjeando(false);
    }
  };

  const alcanza = elegido && saldo.puntos >= elegido.valor_puntos;

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="alumno__seccion">
        <h2 className="seccion__titulo">Tus puntos</h2>
        <p className="saldo">{saldo.puntos}</p>
        <p className="seccion__ayuda">Sumás puntos cada vez que asistís a un turno.</p>

        <div className="puntos">
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Premio</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {premios.length === 0 && (
                  <tr>
                    <td colSpan={2} className="tabla__vacia">Todavía no hay premios disponibles.</td>
                  </tr>
                )}
                {premios.map((p) => {
                  const sinStock = p.stock !== null && p.stock <= 0;
                  return (
                    <tr
                      key={p.id_premio}
                      className={`fila-elegible${elegido?.id_premio === p.id_premio ? ' is-active' : ''}${sinStock ? ' is-inactivo' : ''}`}
                    >
                      <td>
                        <button
                          type="button"
                          className="fila-elegible__boton"
                          disabled={sinStock}
                          onClick={() => setElegido(p)}
                        >
                          {p.nombre}
                          {sinStock && ' (sin stock)'}
                        </button>
                        {p.descripcion && <div className="tabla__detalle">{p.descripcion}</div>}
                      </td>
                      <td>{p.valor_puntos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {elegido && (
            <div className="resumen resumen--canje">
              <div>
                <h3 className="resumen__titulo">Resumen de tu canje</h3>
                <p className="resumen__linea">{elegido.nombre}: {elegido.valor_puntos} puntos</p>
                {!alcanza && (
                  <p className="resumen__linea">Te faltan {elegido.valor_puntos - saldo.puntos} puntos.</p>
                )}
              </div>
              <button type="button" className="resumen__pagar" onClick={canjear} disabled={!alcanza || canjeando}>
                {canjeando ? 'Canjeando…' : 'Canjear'}
              </button>
            </div>
          )}
        </div>
      </section>

      {saldo.canjes.length > 0 && (
        <section className="alumno__seccion">
          <h2 className="seccion__titulo">Mis canjes</h2>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Premio</th>
                  <th>Puntos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {saldo.canjes.map((c) => (
                  <tr key={c.id_canje}>
                    <td>{formatearFecha(c.fecha)}</td>
                    <td>{c.premio}</td>
                    <td>{c.puntos_usados}</td>
                    <td>
                      <span className={`estado${c.estado === 'entregado' ? ' estado--off' : ''}`}>
                        {c.estado === 'entregado' ? 'Entregado' : 'Para retirar en recepción'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}