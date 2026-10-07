import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import Aviso from '../gestion/Aviso';

// Rutina de musculación del alumno: 3 días, con los pesos editables
export default function AlumnoRutina() {
  const [rutina, setRutina] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [dia, setDia] = useState(1);
  const [pesos, setPesos] = useState({}); // { id_rutina_ejercicio: 'valor' }
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/rutinas/mia');
      setRutina(data);
      if (data) {
        const iniciales = {};
        data.dias.forEach((d) => d.ejercicios.forEach((e) => {
          iniciales[e.id_rutina_ejercicio] = e.peso_kg === null ? '' : String(Number(e.peso_kg));
        }));
        setPesos(iniciales);
        // Abrir el primer día que tenga ejercicios
        const primero = data.dias.find((d) => d.ejercicios.length > 0);
        if (primero) setDia(primero.dia);
      }
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="dash__status">Cargando tu rutina…</p>;

  if (!rutina) {
    return (
      <section className="alumno__seccion alumno__vacio">
        <p>Todavía no tenés una rutina asignada. Pedile a tu profesor que te arme una.</p>
      </section>
    );
  }

  const ejercicios = rutina.dias.find((d) => d.dia === dia)?.ejercicios || [];

  // Solo se envían los pesos que cambiaron
  const cambios = rutina.dias
    .flatMap((d) => d.ejercicios)
    .filter((e) => (e.peso_kg === null ? '' : String(Number(e.peso_kg))) !== pesos[e.id_rutina_ejercicio]);

  const guardarPesos = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      await api.patch(`/rutinas/${rutina.id_rutina}/pesos`, {
        pesos: cambios.map((e) => ({ id_rutina_ejercicio: e.id_rutina_ejercicio, peso_kg: pesos[e.id_rutina_ejercicio] })),
      });
      setAviso({ tipo: 'ok', texto: 'Pesos guardados.' });
      await cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="alumno__seccion">
      <h2 className="seccion__titulo">{rutina.nombre || 'Mi rutina'}</h2>
      {rutina.creada_por && <p className="seccion__ayuda">Armada por {rutina.creada_por}.</p>}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <div className="chips">
        {rutina.dias.map((d) => (
          <button
            key={d.dia}
            type="button"
            className={`chip${d.dia === dia ? ' is-active' : ''}`}
            disabled={d.ejercicios.length === 0}
            onClick={() => setDia(d.dia)}
          >
            Día {d.dia}
          </button>
        ))}
      </div>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Ejercicio</th>
              <th>Series</th>
              <th>Repeticiones</th>
              <th>Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {ejercicios.map((e) => (
              <tr key={e.id_rutina_ejercicio}>
                <td>
                  {e.nombre}
                  {e.observaciones && <div className="tabla__detalle">{e.observaciones}</div>}
                </td>
                <td>{e.series}</td>
                <td>{e.repeticiones}</td>
                <td>
                  <input
                    className="input-tabla"
                    type="number"
                    min="0"
                    step="0.5"
                    style={{ maxWidth: 90 }}
                    placeholder="-"
                    value={pesos[e.id_rutina_ejercicio] ?? ''}
                    onChange={(ev) => setPesos((p) => ({ ...p, [e.id_rutina_ejercicio]: ev.target.value }))}
                    aria-label={`Peso de ${e.nombre}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cambios.length > 0 && (
        <div className="alumno__acciones alumno__acciones--izq">
          <button type="button" className="btn" onClick={guardarPesos} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar pesos'}
          </button>
        </div>
      )}
    </section>
  );
}