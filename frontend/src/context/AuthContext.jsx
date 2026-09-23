import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const SESSION_KEY = 'fitnesspro_session';
const TOKEN_KEY = 'fitnesspro_token';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJSON(SESSION_KEY, null));

  // Iniciar sesión real con el backend
  const login = useCallback(async ({ email, password }) => {
    try {
      const response = await api.post('/auth/login', {
        mail: email,
        clave: password,
      });

      const { token, usuario } = response.data;

      // Guardar token JWT y datos de sesión en localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));

      setUser(usuario);
      return usuario;
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ||
        err.response?.data?.error ||
        'Error al conectar con el servidor';
      throw new Error(mensaje);
    }
  }, []);

  // Cerrar sesión
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
}