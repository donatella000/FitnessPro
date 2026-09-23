import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Adjunta el token JWT automáticamente a cada consulta protegida
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fitnesspro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;