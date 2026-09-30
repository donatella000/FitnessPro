import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth, getToken } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/Dashboard.css';

const NAV_ITEMS = ['Perfil', 'Turnos', 'Rutina', 'Pagos', 'Puntos', 'Plan nutricional', 'Medidas'];

function formatFecha(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/dashboard/mi-abono`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.mensaje || 'No se pudo cargar el dashboard.');
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Si no hay sesión (recarga de página, link directo, etc.) mandamos a la home.
  if (!user) return <Navigate to="/" replace />;

  return (
    <>
      <Navbar />
      <main className="dash">
        <h1 className="dash__title">Hola, {user.nombre}</h1>

        <nav className="dash__nav" aria-label="Secciones de tu cuenta">
          {NAV_ITEMS.map((item) => (
            <button key={item} type="button" className="dash__navitem">
              {item}
            </button>
          ))}
        </nav>

        {loading && <p className="dash__status">Cargando tu abono…</p>}
        {!loading && error && <p className="dash__status dash__status--error">{error}</p>}

        {!loading && !error && data && (
          <>
            {data.turnos_restantes === null ? (
              <p className="dash__status">{data.mensaje}</p>
            ) : (
              <div className="dash__table">
                <div className="dash__row dash__row--head">
                  <span>Tu abono</span>
                  <span>Vencimiento</span>
                  <span>Turnos restantes</span>
                </div>
                <div className="dash__row dash__row--body">
                  <span>{data.plan}</span>
                  <span>{formatFecha(data.vencimiento)}</span>
                  <span>{data.turnos_restantes}</span>
                </div>
              </div>
            )}

            <button type="button" className="btn-pill dash__pay">
              Pagar abono
            </button>
          </>
        )}
      </main>
    </>
  );
}
