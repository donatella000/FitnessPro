import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UserMenu.css';

// Íconos simples en SVG (trazo), heredan el color del texto
const ICONOS = {
  usuarios: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  actividades: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  clases: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3M8 17h6',
  suscripciones: 'M3 6h18v12H3zM3 10h18M7 15h4',
  abono: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  clave: 'M14 10a4 4 0 1 0-3.46 3.96L9 15.5V18H6.5v2.5H4V18l6.04-6.04M15.5 8.5h.01',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
};

function Icono({ nombre }) {
  return (
    <svg className="usermenu__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

// Opciones según el rol (1 = admin, 2 = profesor, 3 = alumno)
const OPCIONES_POR_ROL = {
  1: [
    { label: 'Gestión de usuarios', icono: 'usuarios', to: '/dashboard?vista=admin&seccion=usuarios' },
    { label: 'Actividades', icono: 'actividades', to: '/dashboard?vista=admin&seccion=actividades' },
    { label: 'Clases y horarios', icono: 'clases', to: '/dashboard?vista=admin&seccion=clases' },
    { label: 'Suscripciones', icono: 'suscripciones', to: '/dashboard?vista=admin&seccion=suscripciones' },
  ],
  2: [
    { label: 'Mis alumnos', icono: 'usuarios', to: '/dashboard?vista=profesor&seccion=usuarios' },
    { label: 'Mis clases y horarios', icono: 'clases', to: '/dashboard?vista=profesor&seccion=clases' },
  ],
  3: [
    { label: 'Mi abono', icono: 'abono', to: '/dashboard?vista=alumno' },
  ],
};

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const nombre = useRef(null);
  const [flecha, setFlecha] = useState(104);

  // Cerrar al hacer clic afuera o con Escape
  useEffect(() => {
    if (!abierto) return undefined;

    const alHacerClic = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    const alApretarTecla = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alApretarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alApretarTecla);
    };
  }, [abierto]);

  if (!user) return null;

  const opciones = OPCIONES_POR_ROL[user.id_rol] || OPCIONES_POR_ROL[3];

  const cerrarSesion = () => {
    setAbierto(false);
    localStorage.removeItem('fitnesspro_vista');
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="usermenu" ref={contenedor}>
      <button
        type="button"
        className="usermenu__boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => {
          // Ubica la flechita del desplegable justo debajo del avatar
          if (nombre.current) setFlecha(nombre.current.offsetWidth + 8 + 19 - 7);
          setAbierto((v) => !v);
        }}
      >
        <span className="usermenu__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="8.5" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
          </svg>
        </span>
        <span className="usermenu__nombre" ref={nombre}>{user.nombre}</span>
      </button>

      {abierto && (
        <div className="usermenu__lista" role="menu" style={{ '--flecha': `${flecha}px` }}>
          {opciones.map((op) => (
            <Link
              key={op.to}
              to={op.to}
              role="menuitem"
              className="usermenu__item"
              onClick={() => setAbierto(false)}
            >
              <Icono nombre={op.icono} />
              {op.label}
            </Link>
          ))}

          <hr className="usermenu__separador" />

          <Link
            to="/cambiar-password"
            role="menuitem"
            className="usermenu__item"
            onClick={() => setAbierto(false)}
          >
            <Icono nombre="clave" />
            Cambiar contraseña
          </Link>

          <button type="button" role="menuitem" className="usermenu__item" onClick={cerrarSesion}>
            <Icono nombre="salir" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}