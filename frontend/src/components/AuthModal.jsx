import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthModal.css';

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  password: '',
  confirmar: '',
};

export default function AuthModal({ open, onClose }) {
  const { login, register, solicitarRecuperacion } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  // Estado propio de la vista "olvidé mi contraseña"
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  // Al abrir: volver al estado inicial
  useEffect(() => {
    if (open) {
      setMode('login');
      setForm(EMPTY_FORM);
      setError('');
      setVerPassword(false);
      setVerConfirmar(false);
      setForgotEmail('');
      setForgotMsg('');
    }
  }, [open]);

  // Cerrar con Escape y bloquear el scroll de fondo mientras está abierto
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  const switchMode = (next) => {
    setMode(next);
    setForm(EMPTY_FORM);
    setError('');
    setVerPassword(false);
    setVerConfirmar(false);
    setForgotEmail('');
    setForgotMsg('');
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const email = form.email.trim().toLowerCase();

    if (isRegister) {
      if (form.nombre.trim().length < 2) return setError('Escribí tu nombre.');
      if (form.apellido.trim().length < 2) return setError('Escribí tu apellido.');
      if (!/^\d{6,10}$/.test(form.dni.trim())) return setError('Ingresá un DNI válido, sin puntos.');
      if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
      if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const usuario = isRegister
        ? await register({
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            dni: form.dni.trim(),
            email,
            password: form.password,
          })
        : await login({ email, password: form.password });

      // Al ingresar, el panel arranca siempre desde la primera pestaña
      localStorage.removeItem('fitnesspro_vista');
      onClose();

      // Se queda en la portada, salvo que tenga que cambiar la contraseña
      if (usuario.debe_cambiar_password) {
        navigate('/cambiar-password');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');

    const email = forgotEmail.trim().toLowerCase();
    if (!email) return setError('Ingresá tu correo electrónico.');

    setLoading(true);
    try {
      const mensaje = await solicitarRecuperacion({ email });
      setForgotMsg(mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth__overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth__panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="auth__close" aria-label="Cerrar" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        <h2 id="auth-title" className="auth__title">
          {isForgot ? 'Recuperar contraseña' : isRegister ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}
        </h2>

        {!isForgot && (
          <div className="auth__tabs" role="tablist" aria-label="Tipo de acceso">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={!isRegister ? 'is-active' : ''}
              onClick={() => switchMode('login')}
            >
              Ingresar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={isRegister ? 'is-active' : ''}
              onClick={() => switchMode('register')}
            >
              Registrarme
            </button>
          </div>
        )}

        {isForgot ? (
          <form className="auth__form" onSubmit={handleForgotSubmit}>
            <p className="auth__hint">
              Ingresá tu correo electrónico y te mandamos instrucciones para elegir una nueva contraseña.
            </p>

            <label className="auth__field">
              <span>Email</span>
              <input
                name="forgotEmail"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoFocus
                required
              />
            </label>

            {forgotMsg && <p className="auth__success" role="status">{forgotMsg}</p>}
            {error && (
              <p className="auth__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-pill auth__submit" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar instrucciones'}
            </button>

            <button type="button" className="auth__link" onClick={() => switchMode('login')}>
              Volver a ingresar
            </button>
          </form>
        ) : (
          // key={mode} remonta el formulario y hace que autoFocus caiga en el primer campo
          <form key={mode} className="auth__form" onSubmit={handleSubmit} noValidate={false}>
            {isRegister && (
              <>
                <label className="auth__field">
                  <span>Nombre</span>
                  <input
                    name="nombre"
                    type="text"
                    autoComplete="given-name"
                    value={form.nombre}
                    onChange={handleChange}
                    autoFocus
                    required
                  />
                </label>

                <label className="auth__field">
                  <span>Apellido</span>
                  <input
                    name="apellido"
                    type="text"
                    autoComplete="family-name"
                    value={form.apellido}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="auth__field">
                  <span>DNI</span>
                  <input
                    name="dni"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.dni}
                    onChange={handleChange}
                    required
                  />
                </label>
              </>
            )}

            <label className="auth__field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                autoFocus={!isRegister}
                required
              />
            </label>

            <label className="auth__field">
              <span>Contraseña</span>
              <div className="auth__password-wrap">
                <input
                  name="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="auth__toggle-password"
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

            {!isRegister && (
              <button
                type="button"
                className="auth__link auth__link--forgot"
                onClick={() => switchMode('forgot')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {isRegister && (
              <label className="auth__field">
                <span>Repetí la contraseña</span>
                <div className="auth__password-wrap">
                  <input
                    name="confirmar"
                    type={verConfirmar ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.confirmar}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="auth__toggle-password"
                    onClick={() => setVerConfirmar((v) => !v)}
                    aria-label={verConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verConfirmar ? (
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
            )}

            {error && (
              <p className="auth__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-pill auth__submit" disabled={loading}>
              {loading ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}