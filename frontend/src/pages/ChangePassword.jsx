import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Reutiliza los estilos de la pantalla de restablecer contraseña
import '../styles/ResetPassword.css';
// Estilo del botón tipo enlace ("Cerrar sesión" / "Volver")
import '../styles/AuthModal.css';

// Campo de contraseña con su propio botón de ojito para mostrar u ocultar
function CampoClave({ etiqueta, valor, onChange, autoComplete, autoFocus = false }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="reset__field">
      <span>{etiqueta}</span>
      <div className="reset__password-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="reset__toggle-password"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.88 5.09A10.94 10.94 0 0 1 12 5c6 0 10 7 10 7a17.6 17.6 0 0 1-3.22 4.19M6.6 6.6C4.08 8.13 2 10.8 2 10.8s4 7 10 7c1.08 0 2.1-.18 3.04-.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}

export default function ChangePassword() {
  const { user, cambiarPassword, logout } = useAuth();
  const navigate = useNavigate();

  const [claveActual, setClaveActual] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Sin sesión no tiene sentido esta pantalla
  if (!user) return <Navigate to="/" replace />;

  const esObligatorio = user.debe_cambiar_password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (nuevaClave.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres.');
    }
    if (nuevaClave !== confirmar) {
      return setError('Las contraseñas no coinciden.');
    }
    if (nuevaClave === claveActual) {
      return setError('La nueva contraseña debe ser distinta de la actual.');
    }

    setLoading(true);
    try {
      const msg = await cambiarPassword({ claveActual, nuevaClave });
      setMensaje(msg);
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarSesion = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="reset__overlay">
      <div className="reset__panel">
        <h2>{esObligatorio ? 'Actualizá tu contraseña' : 'Cambiar contraseña'}</h2>

        {esObligatorio && !mensaje && (
          <p>
            Hola {user.nombre}. Por seguridad, antes de continuar tenés que reemplazar la
            contraseña inicial por una nueva de tu elección.
          </p>
        )}

        {mensaje ? (
          <>
            <p className="reset__success">{mensaje}</p>
            <p>Te vamos a llevar a tu panel…</p>
          </>
        ) : (
          <form className="reset__form" onSubmit={handleSubmit}>
            <CampoClave
              etiqueta="Contraseña actual"
              valor={claveActual}
              onChange={setClaveActual}
              autoComplete="current-password"
              autoFocus
            />
            <CampoClave
              etiqueta="Nueva contraseña"
              valor={nuevaClave}
              onChange={setNuevaClave}
              autoComplete="new-password"
            />
            <CampoClave
              etiqueta="Repetí la nueva contraseña"
              valor={confirmar}
              onChange={setConfirmar}
              autoComplete="new-password"
            />

            {error && <p className="reset__error" role="alert">{error}</p>}

            <button type="submit" className="btn-pill reset__submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>

            {esObligatorio ? (
              <button type="button" className="auth__link" onClick={handleCerrarSesion}>
                Cerrar sesión
              </button>
            ) : (
              <button type="button" className="auth__link" onClick={() => navigate('/dashboard')}>
                Volver
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}