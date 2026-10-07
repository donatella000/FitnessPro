import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha, formatearPrecio, hoyISO, sumarDias } from '../../utils/formato';
import Aviso from '../gestion/Aviso';

// Elegir y pagar un abono con Mercado Pago, y ver el historial de pagos
export default function AlumnoPagos() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [elegida, setElegida] = useState(null);
  const [pagando, setPagando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [rSus, rAbono, rPagos] = await Promise.all([
        api.get('/suscripciones'),
        api.get('/dashboard/mi-abono'),
        api.get('/pagos'),
      ]);
      setSuscripciones(rSus.data);
      setAbonos(rAbono.data.abonos);
      setHistorial(rPagos.data);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="dash__status">Cargando…</p>;

  // Agrupar los planes por actividad
  const porActividad = suscripciones.reduce((grupos, s) => {
    (grupos[s.actividad] = grupos[s.actividad] || []).push(s);
    return grupos;
  }, {});

  // Si ya tiene un abono vigente de la misma actividad, el nuevo empieza al día siguiente del vencimiento
  const vigencia = (plan) => {
    const vigentes = abonos.filter((a) => a.actividad === plan.actividad).map((a) => a.vencimiento);
    const inicio = vigentes.length ? sumarDias(vigentes.sort().at(-1), 1) : hoyISO();
    return { inicio, fin: sumarDias(inicio, plan.duracion_dias) };
  };

  const pagar = async () => {
    setPagando(true);
    setAviso(null);
    try {
      const { data } = await api.post('/pagos/crear-preferencia', { id_suscripcion: elegida.id_suscripcion });
      // Lleva al alumno a la página de pago de Mercado Pago
      window.location.href = data.init_point;
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
      setPagando(false);
    }
  };

  const fechas = elegida && vigencia(elegida);

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className="alumno__seccion">
        <h2 className="seccion__titulo">Elegí tu suscripción</h2>

        {Object.keys(porActividad).length === 0 && (
          <p className="seccion__ayuda">Todavía no hay planes disponibles.</p>
        )}

        {Object.entries(porActividad).map(([nombre, planes]) => (
          <div key={nombre} className="planes">
            <h3 className="planes__actividad">{nombre}</h3>
            {planes.map((p) => (
              <button
                key={p.id_suscripcion}
                type="button"
                className={`plan${elegida?.id_suscripcion === p.id_suscripcion ? ' is-active' : ''}`}
                aria-pressed={elegida?.id_suscripcion === p.id_suscripcion}
                onClick={() => setElegida(p)}
              >
                <span className="plan__nombre">{p.nombre}</span>
                <span className="plan__detalle">
                  {formatearPrecio(p.precio)}: {p.cantidad_turnos} turnos, válido por {p.duracion_dias} días corridos
                </span>
              </button>
            ))}
          </div>
        ))}

        {elegida && (
          <div className="resumen">
            <div>
              <h3 className="resumen__titulo">Resumen de pago</h3>
              <p className="resumen__linea">{elegida.nombre}: {formatearPrecio(elegida.precio)}</p>
              <p className="resumen__linea">
                Válido desde {formatearFecha(fechas.inicio)} hasta {formatearFecha(fechas.fin)}
              </p>
            </div>
            <button type="button" className="resumen__pagar" onClick={pagar} disabled={pagando}>
              {pagando ? 'Redirigiendo…' : 'Pagar con Mercado Pago'}
            </button>
          </div>
        )}

        <p className="form__nota alumno__nota">
          Los pagos con tarjeta o en efectivo se realizan en forma presencial en el gimnasio.
        </p>
      </section>

      <section className="alumno__seccion">
        <h2 className="seccion__titulo">Historial de pagos</h2>
        {historial.length === 0 ? (
          <p className="seccion__ayuda">Todavía no registrás pagos.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tu abono</th>
                  <th>Vencimiento</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((p) => (
                  <tr key={p.id_pago}>
                    <td>{formatearFecha(p.fecha_pago)}</td>
                    <td>{p.suscripcion}</td>
                    <td>{formatearFecha(p.vencimiento)}</td>
                    <td>{formatearPrecio(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}