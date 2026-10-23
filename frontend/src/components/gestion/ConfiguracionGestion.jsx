import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from './Aviso';

const GRUPOS = [
  {
    titulo: 'Puntos',
    ayuda: 'Los regalos de bienvenida y de cumpleaños se suman solos. Para que sean proporcionales, conviene pensarlos como una cantidad de asistencias.',
    campos: [
      { clave: 'puntos_por_asistencia', etiqueta: 'Por cada asistencia', sufijo: 'puntos' },
      { clave: 'puntos_bienvenida', etiqueta: 'Regalo al registrarse', sufijo: 'puntos' },
      { clave: 'puntos_cumpleanios', etiqueta: 'Regalo de cumpleaños', sufijo: 'puntos' },
    ],
  },
  {
    titulo: 'Turnos y molinete',
    ayuda: 'Reglas que se aplican al reservar, cancelar e ingresar por el molinete.',
    campos: [
      { clave: 'margen_ingreso_minutos', etiqueta: 'Margen para ingresar (antes y después del inicio)', sufijo: 'minutos' },
      { clave: 'limite_reserva_minutos', etiqueta: 'Se puede reservar hasta', sufijo: 'minutos antes' },
      { clave: 'limite_cancelacion_minutos', etiqueta: 'Se puede cancelar hasta', sufijo: 'minutos antes' },
      { clave: 'dias_visibles_turnos', etiqueta: 'Días que ve el alumno en la grilla', sufijo: 'días' },
    ],
  },
];

// Configuración general del gimnasio (solo Admin)
export default function ConfiguracionGestion() {
  const [valores, setValores] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/dashboard/configuracion')
      .then(({ data }) => setValores(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? '']))))
      .catch((error) => setAviso({ tipo: 'error', texto: mensajeDeError(error) }));
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const cuerpo = Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, Number(v)]));
      const { data } = await api.put('/dashboard/configuracion', cuerpo);
      setAviso({ tipo: 'ok', texto: data.mensaje });
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  if (!valores) return aviso ? <Aviso aviso={aviso} /> : <p className="cargando">Cargando…</p>;

  const asistencia = Number(valores.puntos_por_asistencia) || 0;
  const equivalencia = (clave) => (asistencia > 0 ? ` (equivale a ${Math.round((Number(valores[clave]) / asistencia) * 10) / 10} asistencias)` : '');

  return (
    <form onSubmit={guardar}>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      {GRUPOS.map((grupo) => (
        <section className="seccion" key={grupo.titulo}>
          <h2 className="seccion__titulo">{grupo.titulo}</h2>
          <p className="seccion__ayuda">{grupo.ayuda}</p>
          <div className="form">
            {grupo.campos.map((c) => (
              <label className="campo" key={c.clave}>
                {c.etiqueta}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={valores[c.clave]}
                  onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
                  required
                />
                <span className="campo__nota">
                  {c.sufijo}
                  {(c.clave === 'puntos_bienvenida' || c.clave === 'puntos_cumpleanios') && equivalencia(c.clave)}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="form__acciones" style={{ marginTop: 24 }}>
        <button type="submit" className="btn" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
