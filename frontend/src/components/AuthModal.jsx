import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthModal.css';

export default function AuthModal({ open, onClose }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ email: '', password: '' });
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      onClose();
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
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        <h2 id="auth-title" className="auth__title">Ingresá a FitnessPro</h2>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label className="auth__field">
            <span>Correo electrónico</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              autoFocus
              required
            />
          </label>

          <label className="auth__field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <p className="auth__error" role="alert">{error}</p>}

          <button type="submit" className="btn-pill auth__submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
