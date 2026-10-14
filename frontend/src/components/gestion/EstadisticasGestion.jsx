import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha, formatearPrecio, hoyISO, sumarDias } from '../../utils/formato';
import Aviso from './Aviso';
import '../../styles/Estadisticas.css';

const PERIODOS = [
  { dias: 7, texto: 'Últimos 7 días' },
  { dias: 30, texto: 'Últimos 30 días' },
  { dias: 90, texto: 'Últimos 90 días' },
];

const SEXOS = { M: 'Hombres', F: 'Mujeres', Otro: 'Otro', 'Sin dato': 'Sin dato' };

// Gráfico de barras horizontales simple, sin librerías
function Barras({ datos, etiqueta, valor, formato = (v) => v, vacio = 'Sin datos en el período.' }) {
  if (!datos || datos.length === 0) return <p className="seccion__ayuda">{vacio}</p>;
  const maximo = Math.max(...datos.map((d) => Number(valor(d)) || 0), 1);

  return (
    <ul className="barras">
      {datos.map((d, i) => {
        const v = Number(valor(d)) || 0;
        return (
          <li key={i} className="barras__fila">
            <span className="barras__etiqueta">{etiqueta(d)}</span>
            <span className="barras__pista">
              <span className="barras__relleno" style={{ width: `${(v / maximo) * 100}%` }} />
            </span>
            <span className="barras__valor">{formato(v, d)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <div className="tarjeta">
      <span className="tarjeta__titulo">{titulo}</span>
      <strong className="tarjeta__valor">{valor}</strong>
      {detalle && <span className="tarjeta__detalle">{detalle}</span>}
    </div>
  );
}

// Estadísticas del gimnasio (solo Admin)
export default function EstadisticasGestion() {
  const [desde, setDesde] = useState(sumarDias(hoyISO(), -30));
  const [hasta, setHasta] = useState(hoyISO());
  const [datos, setDatos] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/estadisticas', { params: { desde, hasta } });
      setDatos(data);
      setAviso(null);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegirPeriodo = (dias) => {
    setHasta(hoyISO());
    setDesde(sumarDias(hoyISO(), -dias));
  };

  if (cargando) return <p className="cargando">Cargando estadísticas…</p>;
  if (!datos) return <Aviso aviso={aviso} />;

  const { alumnos, asistencia, edades } = datos;
  const horarios = Object.entries(datos.horarios_mas_concurridos);

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <div className="form form--compacto estadisticas__filtros">
        <div className="campo">
          Período
          <div className="casillas">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                type="button"
                className={`chip-periodo${desde === sumarDias(hoyISO(), -p.dias) && hasta === hoyISO() ? ' is-active' : ''}`}
                onClick={() => elegirPeriodo(p.dias)}
              >
                {p.texto}
              </button>
            ))}
          </div>
        </div>
        <label className="campo">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} />
        </label>
        <label className="campo">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} />
        </label>
      </div>

      <p className="seccion__ayuda">
        Asistencias, pagos, canjes y turnos del {formatearFecha(datos.periodo.desde)} al {formatearFecha(datos.periodo.hasta)}.
        Los datos de sexo y edad son de todos los alumnos activos.
      </p>

      <div className="tarjetas">
        <Tarjeta
          titulo="Alumnos activos"
          valor={`${alumnos.activos} de ${alumnos.inscriptos}`}
          detalle={`${alumnos.porcentaje_activos}% de los inscriptos tiene un abono vigente`}
        />
        <Tarjeta
          titulo="Asistencia efectiva"
          valor={`${asistencia.porcentaje_asistencia}%`}
          detalle={`${asistencia.asistidos} asistencias y ${asistencia.ausentes} ausencias`}
        />
        <Tarjeta
          titulo="Recaudación"
          valor={formatearPrecio(datos.recaudacion_total)}
          detalle={`${datos.suscripciones_mas_elegidas.reduce((t, s) => t + s.cantidad, 0)} pagos aprobados`}
        />
        <Tarjeta
          titulo="Edad promedio"
          valor={edades.promedio !== null ? `${edades.promedio} años` : '-'}
          detalle={edades.rango_predominante ? `Predomina el rango de ${edades.rango_predominante}` : 'Sin fechas de nacimiento cargadas'}
        />
      </div>

      <div className="estadisticas__grilla">
        <section className="panel-dato">
          <h3 className="panel-dato__titulo">Hombres y mujeres</h3>
          <Barras
            datos={datos.sexo}
            etiqueta={(d) => SEXOS[d.sexo] || d.sexo}
            valor={(d) => d.cantidad}
            formato={(v, d) => `${d.porcentaje}% (${v})`}
            vacio="Todavía no hay alumnos."
          />
        </section>

        <section className="panel-dato">
          <h3 className="panel-dato__titulo">Edades</h3>
          <Barras
            datos={edades.rangos}
            etiqueta={(d) => d.rango}
            valor={(d) => d.cantidad}
            vacio="Ningún alumno cargó su fecha de nacimiento."
          />
          {edades.alumnos_sin_fecha_nacimiento > 0 && (
            <p className="form__nota">{edades.alumnos_sin_fecha_nacimiento} alumno(s) sin fecha de nacimiento cargada.</p>
          )}
        </section>

        <section className="panel-dato">
          <h3 className="panel-dato__titulo">Suscripciones más elegidas</h3>
          <Barras
            datos={datos.suscripciones_mas_elegidas}
            etiqueta={(d) => d.suscripcion}
            valor={(d) => d.cantidad}
            formato={(v, d) => `${v} (${formatearPrecio(d.recaudado)})`}
          />
        </section>

        <section className="panel-dato">
          <h3 className="panel-dato__titulo">Profesores más elegidos</h3>
          <Barras
            datos={datos.profesores_mas_elegidos}
            etiqueta={(d) => d.profesor}
            valor={(d) => d.turnos}
            formato={(v, d) => `${v} turnos, ${d.asistencias} asist.`}
          />
        </section>

        <section className="panel-dato">
          <h3 className="panel-dato__titulo">Premios más canjeados</h3>
          <Barras
            datos={datos.premios_mas_canjeados}
            etiqueta={(d) => d.premio}
            valor={(d) => d.cantidad}
          />
        </section>

        <section className="panel-dato">
          <h3 className="panel-dato__titulo">Horarios más concurridos</h3>
          {horarios.length === 0 ? (
            <p className="seccion__ayuda">Sin asistencias en el período.</p>
          ) : (
            horarios.map(([actividad, lista]) => (
              <div key={actividad} className="horarios-top">
                <p className="horarios-top__actividad">{actividad}</p>
                <Barras
                  datos={lista}
                  etiqueta={(d) => `${d.dia} ${d.horario}`}
                  valor={(d) => d.asistencias}
                />
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}