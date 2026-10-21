import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../services/api';
import { formatearFecha, formatearPrecio, hoyISO, sumarDias } from '../../utils/formato';
import Aviso from './Aviso';
import { Barras, Columnas, PanelDato, Tarjeta } from './estadisticas/Graficos';
import Evolucion from './estadisticas/Evolucion';
import ClasesDictadas from './estadisticas/ClasesDictadas';
import '../../styles/Estadisticas.css';

const PERIODOS = [
  { dias: 7, texto: 'Últimos 7 días' },
  { dias: 30, texto: 'Últimos 30 días' },
  { dias: 90, texto: 'Últimos 90 días' },
];

const SEXOS = { M: 'Hombres', F: 'Mujeres', Otro: 'Otro', 'Sin dato': 'Sin dato' };

const TITULOS = {
  evolucion: 'Evolución mes a mes y año a año',
  clases: 'Asistencia por clase dictada',
  profesores: 'Profesores más elegidos',
  suscripciones: 'Suscripciones más elegidas',
  premios: 'Premios más canjeados',
  horarios: 'Horarios más concurridos',
  alumnos: 'Perfil de los alumnos',
};

// Estadísticas del gimnasio (solo Admin).
// El resumen muestra lo principal; cada tarjeta o panel abre una vista de detalle.
export default function EstadisticasGestion() {
  const [desde, setDesde] = useState(sumarDias(hoyISO(), -30));
  const [hasta, setHasta] = useState(hoyISO());
  const [datos, setDatos] = useState(null);
  const [evolucion, setEvolucion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [detalle, setDetalle] = useState(null); // { vista, metrica }

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/estadisticas', { params: { desde, hasta } });
      setDatos(data);
      setAviso(null);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error) });
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    api.get('/dashboard/evolucion').then(({ data }) => setEvolucion(data)).catch(() => {});
  }, []);

  const abrir = (vista, metrica) => {
    setDetalle({ vista, metrica });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const elegirPeriodo = (dias) => {
    setHasta(hoyISO());
    setDesde(sumarDias(hoyISO(), -dias));
  };

  const filtroPeriodo = (
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
  );

  // ------------------------------------------------------------
  // Vistas de detalle
  // ------------------------------------------------------------
  if (detalle) {
    const { vista } = detalle;
    const usaPeriodo = !['evolucion', 'clases'].includes(vista);

    return (
      <div className="estadisticas-detalle">
        <button type="button" className="btn btn--secundario btn--chico" onClick={() => setDetalle(null)}>
          ← Volver a estadísticas
        </button>
        <h2 className="estadisticas-detalle__titulo">{TITULOS[vista]}</h2>

        {usaPeriodo && filtroPeriodo}
        {usaPeriodo && datos && (
          <p className="seccion__ayuda">
            Del {formatearFecha(datos.periodo.desde)} al {formatearFecha(datos.periodo.hasta)}.
          </p>
        )}

        {vista === 'evolucion' && <Evolucion metricaInicial={detalle.metrica} />}
        {vista === 'clases' && <ClasesDictadas />}

        {usaPeriodo && !datos && <p className="cargando">Cargando…</p>}

        {vista === 'profesores' && datos && (
          <>
            <p className="seccion__ayuda">
              Ordenados por asistencias cumplidas en sus clases. Musculación no se incluye porque el alumno no elige profesor.
            </p>
            <section className="panel-dato panel-dato--ancho">
              <Barras completo datos={datos.profesores_mas_elegidos} etiqueta={(d) => d.profesor}
                valor={(d) => d.asistencias} formato={(v) => `${v} asistencias`} />
            </section>
            <div className="tabla-contenedor" style={{ marginTop: 20 }}>
              <table className="tabla">
                <thead><tr><th>#</th><th>Profesor</th><th>Asistencias cumplidas</th><th>Turnos reservados</th><th>Asistencia efectiva</th></tr></thead>
                <tbody>
                  {datos.profesores_mas_elegidos.map((p, i) => (
                    <tr key={p.id_usuario}>
                      <td>{i + 1}</td>
                      <td>{p.profesor}</td>
                      <td>{p.asistencias}</td>
                      <td>{p.turnos}</td>
                      <td>{p.turnos ? Math.round((p.asistencias / p.turnos) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {vista === 'suscripciones' && datos && (
          <>
            <section className="panel-dato panel-dato--ancho">
              <Barras completo datos={datos.suscripciones_mas_elegidas} etiqueta={(d) => d.suscripcion}
                valor={(d) => d.cantidad} formato={(v, d) => `${v} (${formatearPrecio(d.recaudado)})`} />
            </section>
            <div className="tabla-contenedor" style={{ marginTop: 20 }}>
              <table className="tabla">
                <thead><tr><th>Suscripción</th><th>Actividad</th><th>Pagos</th><th>Recaudado</th></tr></thead>
                <tbody>
                  {datos.suscripciones_mas_elegidas.map((s) => (
                    <tr key={s.suscripcion}><td>{s.suscripcion}</td><td>{s.actividad}</td><td>{s.cantidad}</td><td>{formatearPrecio(s.recaudado)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {vista === 'premios' && datos && (
          <section className="panel-dato panel-dato--ancho">
            <Barras completo datos={datos.premios_mas_canjeados} etiqueta={(d) => d.premio}
              valor={(d) => d.cantidad} formato={(v, d) => `${v} canjes (${d.puntos} puntos)`} />
          </section>
        )}

        {vista === 'horarios' && datos && (
          Object.keys(datos.horarios_mas_concurridos).length === 0 ? (
            <p className="seccion__ayuda">Sin asistencias en el período.</p>
          ) : (
            <div className="estadisticas__grilla">
              {Object.entries(datos.horarios_mas_concurridos).map(([actividad, lista]) => (
                <section key={actividad} className="panel-dato">
                  <h3 className="panel-dato__titulo">{actividad}</h3>
                  <Barras completo datos={lista} etiqueta={(d) => `${d.dia} ${d.horario}`}
                    valor={(d) => d.asistencias} formato={(v) => `${v} asist.`} />
                </section>
              ))}
            </div>
          )
        )}

        {vista === 'alumnos' && datos && (
          <>
            <div className="tarjetas">
              <Tarjeta titulo="Alumnos inscriptos" valor={datos.alumnos.inscriptos} />
              <Tarjeta titulo="Con abono vigente" valor={datos.alumnos.activos} detalle={`${datos.alumnos.porcentaje_activos}% de los inscriptos`} />
              <Tarjeta titulo="Edad promedio" valor={datos.edades.promedio !== null ? `${datos.edades.promedio} años` : '-'}
                detalle={datos.edades.rango_predominante ? `Predomina ${datos.edades.rango_predominante}` : null} />
            </div>
            <div className="estadisticas__grilla">
              <section className="panel-dato">
                <h3 className="panel-dato__titulo">Hombres y mujeres</h3>
                <Barras completo datos={datos.sexo} etiqueta={(d) => SEXOS[d.sexo] || d.sexo}
                  valor={(d) => d.cantidad} formato={(v, d) => `${d.porcentaje}% (${v})`} />
              </section>
              <section className="panel-dato">
                <h3 className="panel-dato__titulo">Edades</h3>
                <Barras completo datos={datos.edades.rangos} etiqueta={(d) => d.rango} valor={(d) => d.cantidad}
                  vacio="Ningún alumno cargó su fecha de nacimiento." />
                {datos.edades.alumnos_sin_fecha_nacimiento > 0 && (
                  <p className="form__nota">{datos.edades.alumnos_sin_fecha_nacimiento} alumno(s) sin fecha de nacimiento cargada.</p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------
  // Resumen
  // ------------------------------------------------------------
  if (!datos) return aviso ? <Aviso aviso={aviso} /> : <p className="cargando">Cargando estadísticas…</p>;

  const { alumnos, asistencia, edades } = datos;
  const primerHorario = Object.entries(datos.horarios_mas_concurridos)[0];

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
      {filtroPeriodo}

      <p className="seccion__ayuda">
        Datos del {formatearFecha(datos.periodo.desde)} al {formatearFecha(datos.periodo.hasta)}. Tocá cualquier
        tarjeta o "Ver detalle" para ampliar la información.
      </p>

      <div className="tarjetas">
        <Tarjeta
          titulo="Recaudación del período"
          valor={formatearPrecio(datos.recaudacion_total)}
          detalle={`${datos.suscripciones_mas_elegidas.reduce((t, s) => t + s.cantidad, 0)} pagos aprobados`}
          onClick={() => abrir('evolucion', 'recaudacion')}
        />
        <Tarjeta
          titulo="Asistencia efectiva"
          valor={`${asistencia.porcentaje_asistencia}%`}
          detalle={`${asistencia.asistidos} asistencias y ${asistencia.ausentes} ausencias`}
          onClick={() => abrir('evolucion', 'asistencia')}
        />
        <Tarjeta
          titulo="Inscripciones nuevas"
          valor={datos.nuevos_inscriptos}
          detalle="Alumnos que se registraron en el período"
          onClick={() => abrir('evolucion', 'inscripciones')}
        />
        <Tarjeta
          titulo="Alumnos activos"
          valor={`${alumnos.activos} de ${alumnos.inscriptos}`}
          detalle={`${alumnos.porcentaje_activos}% tiene un abono vigente`}
          onClick={() => abrir('alumnos')}
        />
        <Tarjeta
          titulo="Profesor más elegido"
          valor={datos.profesor_mas_elegido || '-'}
          detalle={datos.profesor_mas_elegido ? `${datos.profesores_mas_elegidos[0].asistencias} asistencias cumplidas` : 'Sin asistencias en el período'}
          onClick={() => abrir('profesores')}
        />
      </div>

      <div className="estadisticas__grilla">
        <PanelDato titulo={`Recaudación mes a mes${evolucion ? `, ${evolucion.anio}` : ''}`} onClick={() => abrir('evolucion', 'recaudacion')}>
          {evolucion ? (
            <>
              <Columnas
                compacto
                datos={evolucion.meses}
                valor={(m) => m.recaudacion}
                etiqueta={(m) => m.nombre.slice(0, 1)}
                destacado={evolucion.mejor_mes.recaudacion ? evolucion.mejor_mes.recaudacion.mes - 1 : null}
                apagado={(m) => m.futuro}
              />
              <p className="form__nota">
                {evolucion.mejor_mes.asistencias ? `Más asistencias: ${evolucion.mejor_mes.asistencias.nombre}. ` : ''}
                {evolucion.mejor_mes.inscripciones ? `Más inscripciones: ${evolucion.mejor_mes.inscripciones.nombre}.` : ''}
              </p>
            </>
          ) : <p className="cargando">Cargando…</p>}
        </PanelDato>

        <PanelDato titulo="Asistencia por clase dictada" onClick={() => abrir('clases')}>
          <p className="seccion__ayuda" style={{ margin: 0 }}>
            Entrá a cualquier clase ya finalizada para ver cuántos alumnos se anotaron, cuántos asistieron y quiénes.
          </p>
        </PanelDato>

        <PanelDato titulo="Profesores más elegidos" onClick={() => abrir('profesores')}>
          <Barras datos={datos.profesores_mas_elegidos.slice(0, 3)} etiqueta={(d) => d.profesor}
            valor={(d) => d.asistencias} formato={(v) => `${v} asist.`} />
        </PanelDato>

        <PanelDato titulo="Suscripciones más elegidas" onClick={() => abrir('suscripciones')}>
          <Barras datos={datos.suscripciones_mas_elegidas.slice(0, 3)} etiqueta={(d) => d.suscripcion} valor={(d) => d.cantidad} />
        </PanelDato>

        <PanelDato titulo="Horarios más concurridos" onClick={() => abrir('horarios')}>
          {primerHorario ? (
            <>
              <p className="horarios-top__actividad">{primerHorario[0]}</p>
              <Barras datos={primerHorario[1]} etiqueta={(d) => `${d.dia} ${d.horario}`} valor={(d) => d.asistencias} />
            </>
          ) : <p className="seccion__ayuda">Sin asistencias en el período.</p>}
        </PanelDato>

        <PanelDato titulo="Premios más canjeados" onClick={() => abrir('premios')}>
          <Barras datos={datos.premios_mas_canjeados.slice(0, 3)} etiqueta={(d) => d.premio} valor={(d) => d.cantidad} />
        </PanelDato>

        <PanelDato titulo="Hombres y mujeres" onClick={() => abrir('alumnos')}>
          <Barras datos={datos.sexo} etiqueta={(d) => SEXOS[d.sexo] || d.sexo}
            valor={(d) => d.cantidad} formato={(v, d) => `${d.porcentaje}%`} vacio="Todavía no hay alumnos." />
        </PanelDato>

        <PanelDato titulo="Edades" onClick={() => abrir('alumnos')}>
          <Barras datos={edades.rangos} etiqueta={(d) => d.rango} valor={(d) => d.cantidad}
            vacio="Ningún alumno cargó su fecha de nacimiento." />
        </PanelDato>
      </div>
    </>
  );
}