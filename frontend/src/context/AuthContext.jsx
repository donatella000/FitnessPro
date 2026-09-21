import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/*
 * IMPORTANTE: esto SIMULA un backend usando localStorage para que puedas
 * probar el flujo completo (registro, login, logout) sin servidor.
 * Las contraseñas se guardan en texto plano, algo que NUNCA se debe hacer en producción.
 *
 * Cuando tengas tu API, reemplazá el cuerpo de `login` y `register` por un fetch, por ejemplo:
 *   const res = await fetch('/api/auth/login', { method: 'POST', ... });
 * y dejá el resto de la app igual.
 */

const USERS_KEY = 'fitnesspro_users';
const SESSION_KEY = 'fitnesspro_session';

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

  const startSession = useCallback((nextUser) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const register = useCallback(
    async ({ nombre, email, password }) => {
      const users = readJSON(USERS_KEY, []);
      if (users.some((u) => u.email === email)) {
        throw new Error('Ese email ya está registrado. Ingresá con tu contraseña.');
      }
      users.push({ nombre, email, password });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      startSession({ nombre, email });
    },
    [startSession]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const users = readJSON(USERS_KEY, []);
      const found = users.find((u) => u.email === email && u.password === password);
      if (!found) {
        throw new Error('Email o contraseña incorrectos.');
      }
      startSession({ nombre: found.nombre, email: found.email });
    },
    [startSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
}
