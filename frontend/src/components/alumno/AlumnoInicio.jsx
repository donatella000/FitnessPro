import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha } from '../../utils/formato';

const NAV_ITEMS = ['Perfil', 'Turnos', 'Rutina', 'Pagos', 'Puntos'];

// Pantalla principal del alumno: sus abonos vigentes.
// Las secciones del menú se van a completar en el próximo paso.
export default function AlumnoInicio() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    api.get('/dashboard/mi-abono')
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

  return (
    <>
      <nav className="dash__nav" aria-label="Secciones de tu cuenta">
        {NAV_ITEMS.map((item) => (
          <button key={item} type="button" className="dash__navitem">
            {item}
          </button>
        ))}
      </nav>

      {cargando && <p className="dash__status">Cargando tu abono…</p>}
      {!cargando && error && <p className="dash__status dash__status--error">{error}</p>}

      {!cargando && !error && data && (
        <>
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

          <button type="button" className="btn-pill dash__pay">
            Pagar abono
          </button>
        </>
      )}
    </>
  );
}