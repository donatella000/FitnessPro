import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import '../styles/temas.css';

// Temas disponibles. El admin elige uno desde el panel y queda activo hasta que lo cambie.
export const TEMAS = {
  normal: { nombre: 'Normal', frase: null },
  navidad: { nombre: 'Navidad', frase: null },
  anio_nuevo: { nombre: 'Año nuevo', frase: '¡FELIZ AÑO NUEVO!' },
  pascuas: { nombre: 'Pascuas', frase: null },
  patria_25_mayo: { nombre: '25 de Mayo', frase: '¡FELIZ 25 DE MAYO!' },
  patria_bandera: { nombre: 'Día de la Bandera', frase: '¡FELIZ DÍA DE LA BANDERA!' },
  patria_independencia: { nombre: 'Día de la Independencia', frase: '¡FELIZ DÍA DE LA INDEPENDENCIA!' },
  mundial: { nombre: 'Mundial', frase: null, franja: '¡VAMOS ARGENTINA!' },
  primavera: { nombre: 'Primavera', frase: null, franja: '¡FELIZ PRIMAVERA!' },
  halloween: { nombre: 'Halloween', frase: null },
};

export const esPatrio = (tema) => tema.startsWith('patria_');

const TemaContext = createContext({ tema: 'normal', setTema: () => {} });

// Lee el tema activo del backend y lo aplica en <html data-tema="...">.
// Los colores de cada tema están en styles/temas.css.
export function TemaProvider({ children }) {
  const [tema, setTemaEstado] = useState('normal');

  const setTema = useCallback((nuevo) => {
    setTemaEstado(TEMAS[nuevo] ? nuevo : 'normal');
  }, []);

  useEffect(() => {
    api.get('/publico/tema')
      .then(({ data }) => setTema(data.tema))
      .catch(() => setTema('normal'));
  }, [setTema]);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  const value = useMemo(() => ({ tema, setTema }), [tema, setTema]);
  return <TemaContext.Provider value={value}>{children}</TemaContext.Provider>;
}

export function useTema() {
  return useContext(TemaContext);
}
