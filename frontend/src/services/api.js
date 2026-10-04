import axios from 'axios';
import { API_URL } from '../config';

const SESSION_KEY = 'fitnesspro_session';
const TOKEN_KEY = 'fitnesspro_token';

// Misma dirección del backend que usa AuthContext (definida en config.js)
const api = axios.create({
  baseURL: API_URL,
});

// Adjunta el token JWT automáticamente a cada consulta protegida
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401 (token vencido o inválido), se cierra la sesión
// y se vuelve al inicio para que el usuario ingrese de nuevo.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Devuelve el mensaje de error que manda el backend, o uno genérico
export function mensajeDeError(error) {
  return error.response?.data?.mensaje || 'Ocurrió un error inesperado.';
}

export default api;