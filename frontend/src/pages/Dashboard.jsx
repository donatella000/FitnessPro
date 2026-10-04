import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api, { mensajeDeError } from '../services/api';
import AlumnoInicio from '../components/alumno/AlumnoInicio';
import PanelGestion from '../components/gestion/PanelGestion';
import '../styles/Dashboard.css';
import '../styles/Panel.css';

const VISTA_KEY = 'fitnesspro_vista';

// Vistas que puede usar cada rol (1 = admin, 2 = profesor, 3 = alumno)
const VISTAS_POR_ROL = {
  1: ['admin', 'profesor', 'alumno'],
  2: ['profesor', 'alumno'],
  3: ['alumno'],
};

const NOMBRE_VISTA = {
  admin: 'Administrador',
  profesor: 'Profesor',
  alumno: 'Alumno',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [molinete, setMolinete] = useState('');
  const disponibles = user ? VISTAS_POR_ROL[user.id_rol] || ['alumno'] : [];

  // La vista sale de la dirección (?vista=admin), que es lo que usa el menú del usuario.
  // Si no viene, se usa la última elegida.
  const vistaUrl = searchParams.get('vista');
  const guardada = localStorage.getItem(VISTA_KEY);
  const vistaActual = disponibles.includes(vistaUrl)
    ? vistaUrl
    : disponibles.includes(guardada) ? guardada : disponibles[0];

  useEffect(() => {
    if (vistaActual) localStorage.setItem(VISTA_KEY, vistaActual);
  }, [vistaActual]);

  if (!user) return <Navigate to="/" replace />;
  if (user.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />;

  const cambiarVista = (nueva) => setSearchParams({ vista: nueva });

  const abrirMolinete = async () => {
    setMolinete('Abriendo…');
    try {
      const { data } = await api.post('/turnos/molinete/apertura');
      setMolinete(data.mensaje);
    } catch (error) {
      setMolinete(mensajeDeError(error));
    }
    setTimeout(() => setMolinete(''), 3000);
  };

  return (
    <>
      <Navbar />
      <main className="dash">
        <div className="dash__top">
          <h1 className="dash__title">Hola, {user.nombre}</h1>

          <div className="dash__acciones">
            {disponibles.length > 1 && (
              <div className="vista" role="group" aria-label="Cambiar vista">
                {disponibles.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`vista__opcion${v === vistaActual ? ' is-active' : ''}`}
                    aria-pressed={v === vistaActual}
                    onClick={() => cambiarVista(v)}
                  >
                    {NOMBRE_VISTA[v]}
                  </button>
                ))}
              </div>
            )}

            {vistaActual !== 'alumno' && (
              <button type="button" className="btn" onClick={abrirMolinete} disabled={Boolean(molinete)}>
                {molinete || 'Abrir molinete'}
              </button>
            )}
          </div>
        </div>

        {vistaActual === 'alumno' ? (
          <AlumnoInicio />
        ) : (
          <PanelGestion esAdmin={vistaActual === 'admin'} />
        )}
      </main>
    </>
  );
}