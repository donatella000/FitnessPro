import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha } from '../../utils/formato';

// Pantalla principal del alumno: sus abonos vigentes
export default function AlumnoInicio({ onIr }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    // Antes de mostrar el abono, se revisa si se acreditó algún pago de Mercado Pago
    api.post('/pagos/verificar')
      .catch(() => {})
      .then(() => api.get('/dashboard/mi-abono'))
      .then(({ data: respuesta }) => {
        if (!cancelado) setData(respuesta);
      })
      .catch((err) => {
        if (!cancelado) setError(mensajeDeError(err));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) return <p className="dash__status">Cargando tu abono…</p>;
  if (error) return <p className="dash__status dash__status--error">{error}</p>;

  return (
    <>
      {data.es_cumpleanios && (
        <div className="cumpleanios" role="status">
          <strong>¡Feliz cumpleaños, {data.nombre}!</strong>
          Todo el equipo de FitnessPro te saluda. Te regalamos puntos que ya están en tu cuenta.
        </div>
      )}

      {data.abonos.length === 0 ? (
        <p className="dash__status">{data.mensaje}</p>
      ) : (
        data.abonos.map((abono) => (
          <div className="dash__table" key={abono.id_suscripcion_alumno}>
            <div className="dash__row dash__row--head">
              <span>Tu abono</span>
              <span>Vencimiento</span>
              <span>Turnos restantes</span>
            </div>
            <div className="dash__row dash__row--body">
              <span>
                {abono.plan}
                {abono.es_renovacion && ` (desde ${formatearFecha(abono.fecha_inicio)})`}
              </span>
              <span>{formatearFecha(abono.vencimiento)}</span>
              <span>{abono.turnos_restantes}</span>
            </div>
          </div>
        ))
      )}

      <div className="alumno__acciones">
        {data.abonos.length > 0 && (
          <button type="button" className="btn-pill" onClick={() => onIr('turnos')}>
            Reservar turno
          </button>
        )}
        <button type="button" className="btn-pill dash__pay" onClick={() => onIr('pagos')}>
          Pagar abono
        </button>
      </div>
    </>
  );
}
