import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AlumnoInicio from './AlumnoInicio';
import AlumnoPerfil from './AlumnoPerfil';
import AlumnoTurnos from './AlumnoTurnos';
import AlumnoRutina from './AlumnoRutina';
import AlumnoPagos from './AlumnoPagos';
import AlumnoPuntos from './AlumnoPuntos';
import '../../styles/Alumno.css';

const SECCIONES = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'perfil', label: 'Perfil' },
  { id: 'turnos', label: 'Turnos' },
  { id: 'rutina', label: 'Rutina' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'puntos', label: 'Puntos' },
];

// Datos que el alumno tiene que completar después de su primer ingreso
const faltanDatos = (perfil) => perfil && (!perfil.telefono || !perfil.fecha_nacimiento || !perfil.sexo);

export default function AlumnoPanel() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [perfil, setPerfil] = useState(null);

  const pedida = searchParams.get('seccion');
  const actual = SECCIONES.some((s) => s.id === pedida) ? pedida : 'inicio';

  const ir = (id) => {
    setSearchParams((params) => {
      params.set('seccion', id);
      return params;
    });
  };

  const cargarPerfil = useCallback(async () => {
    try {
      const { data } = await api.get(`/usuarios/${user.id_usuario}`);
      setPerfil(data);
    } catch {
      // Si falla, simplemente no se muestra el aviso de datos incompletos
    }
  }, [user.id_usuario]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  return (
    <div className="alumno">
      <nav className="dash__nav" aria-label="Secciones de tu cuenta">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`dash__navitem${s.id === actual ? ' is-active' : ''}`}
            aria-current={s.id === actual ? 'page' : undefined}
            onClick={() => ir(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {faltanDatos(perfil) && actual !== 'perfil' && (
        <div className="aviso aviso--error alumno__completar">
          <span>Completá tus datos personales para terminar de configurar tu cuenta.</span>
          <button type="button" className="btn btn--chico" onClick={() => ir('perfil')}>
            Completar mis datos
          </button>
        </div>
      )}

      {actual === 'inicio' && <AlumnoInicio onIr={ir} />}
      {actual === 'perfil' && <AlumnoPerfil perfil={perfil} onGuardado={cargarPerfil} />}
      {actual === 'turnos' && <AlumnoTurnos onIr={ir} />}
      {actual === 'rutina' && <AlumnoRutina />}
      {actual === 'pagos' && <AlumnoPagos />}
      {actual === 'puntos' && <AlumnoPuntos />}
    </div>
  );
}