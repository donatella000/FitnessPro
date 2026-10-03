import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/ResetPassword.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { restablecerPassword } = useAuth();

  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!token) {
      return setError('El link no es válido. Pedí uno nuevo desde la pantalla de ingreso.');
    }
    if (nuevaClave.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (nuevaClave !== confirmar) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const msg = await restablecerPassword({ token, nuevaClave });
      setMensaje(msg);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="reset__overlay">
        <div className="reset__panel">
          <h2>Link inválido</h2>
          <p>Este link no es válido o está incompleto. Volvé a la página principal y pedí uno nuevo.</p>
          <Link to="/" className="btn-pill reset__submit">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reset__overlay">
      <div className="reset__panel">
        <h2>Elegí tu nueva contraseña</h2>

        {mensaje ? (
          <>
            <p className="reset__success">{mensaje}</p>
            <p>Te vamos a redirigir al inicio…</p>
          </>
        ) : (
          <form className="reset__form" onSubmit={handleSubmit}>
            <label className="reset__field">
              <span>Nueva contraseña</span>
              <div className="reset__password-wrap">
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="reset__toggle-password"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword ? (
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

            <label className="reset__field">
              <span>Repetí la contraseña</span>
              <input
                type={verPassword ? 'text' : 'password'}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            {error && <p className="reset__error" role="alert">{error}</p>}

            <button type="submit" className="btn-pill reset__submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}