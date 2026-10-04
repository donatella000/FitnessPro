import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { API_URL } from '../config';
import api, { mensajeDeError } from '../services/api';

/*
 * Manejo de la sesión del usuario.
 * Se guardan en localStorage el token JWT y los datos públicos del usuario,
 * para no perder la sesión al recargar la página.
 */

const LOGIN_PATH = '/auth/login';
const REGISTER_PATH = '/auth/registro';
const OLVIDE_PATH = '/auth/olvide-password';
const RESTABLECER_PATH = '/auth/restablecer-password';
const CAMBIAR_PASSWORD_PATH = '/auth/cambiar-password';

const SESSION_KEY = 'fitnesspro_session';
const TOKEN_KEY = 'fitnesspro_token';

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Llamadas públicas (sin token): login, registro y recuperación de contraseña
async function callApi(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.mensaje || 'Ocurrió un error inesperado.');
  }
  return data;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);

  const startSession = useCallback((nextUser, token) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    if (token) localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  // Devuelve el usuario. Si usuario.debe_cambiar_password es true,
  // quien llama tiene que llevarlo a la pantalla de cambio de contraseña.
  const login = useCallback(
    async ({ email, password }) => {
      const { usuario, token } = await callApi(LOGIN_PATH, { mail: email, clave: password });
      startSession(usuario, token);
      return usuario;
    },
    [startSession]
  );

  // El registro devuelve solo { mensaje, id_usuario }, así que después
  // se hace login automático con las mismas credenciales.
  const register = useCallback(
    async ({ nombre, apellido, dni, email, password, ...resto }) => {
      await callApi(REGISTER_PATH, {
        dni,
        nombre,
        apellido,
        clave: password,
        mail: email,
        ...resto, // campos opcionales: telefono, sexo, fecha_nacimiento, etc.
      });
      return login({ email, password });
    },
    [login]
  );

  const solicitarRecuperacion = useCallback(async ({ email }) => {
    const data = await callApi(OLVIDE_PATH, { mail: email });
    return data.mensaje;
  }, []);

  const restablecerPassword = useCallback(async ({ token, nuevaClave }) => {
    const data = await callApi(RESTABLECER_PATH, { token, nuevaClave });
    return data.mensaje;
  }, []);

  // Cambio de contraseña estando logueado (requiere token).
  // Al terminar, actualiza la sesión para que ya no pida el cambio obligatorio.
  const cambiarPassword = useCallback(
    async ({ claveActual, nuevaClave }) => {
      try {
        const { data } = await api.put(CAMBIAR_PASSWORD_PATH, { claveActual, nuevaClave });
        const usuarioActualizado = { ...readSession(), debe_cambiar_password: false };
        startSession(usuarioActualizado);
        return data.mensaje;
      } catch (error) {
        throw new Error(mensajeDeError(error));
      }
    },
    [startSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout, solicitarRecuperacion, restablecerPassword, cambiarPassword }),
    [user, login, register, logout, solicitarRecuperacion, restablecerPassword, cambiarPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
}