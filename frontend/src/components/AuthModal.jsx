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
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);   // 👈 AGREGAR ESTA LÍNEA
  const [verConfirmar, setVerConfirmar] = useState(false); // 👈 Y ESTA

  // Al abrir: volver al estado inicial
  useEffect(() => {
    if (open) {
      setMode('login');
      setForm(EMPTY_FORM);
      setError('');
      setVerPassword(false);   // 👈 agregar
      setVerConfirmar(false);  // 👈 agregar
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

  const switchMode = (next) => {
    setMode(next);
    setForm(EMPTY_FORM);
    setError('');
    setVerPassword(false);   // 👈 agregar
    setVerConfirmar(false);  // 👈 agregar
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
      if (isRegister) {
        await register({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          dni: form.dni.trim(),
          email,
          password: form.password,
        });
      } else {
        await login({ email, password: form.password });
      }
      onClose();
      navigate('/dashboard');
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
          {isRegister ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}
        </h2>

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

        {/* key={mode} remonta el formulario y hace que autoFocus caiga en el primer campo */}
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
            <input
              name="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {isRegister && (
            <label className="auth__field">
              <span>Repetí la contraseña</span>
              <input
                name="confirmar"
                type="password"
                autoComplete="new-password"
                value={form.confirmar}
                onChange={handleChange}
                required
              />
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
      </div>
    </div>
  );
}