import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../../services/api';
import { formatearPrecio } from '../../../utils/formato';
import Aviso from '../Aviso';
import { Columnas, Tarjeta } from './Graficos';

const METRICAS = {
  recaudacion: {
    titulo: 'Recaudación',
    valor: (m) => m.recaudacion,
    formato: (v) => formatearPrecio(v),
    mejor: 'recaudacion',
  },
  asistencias: {
    titulo: 'Cantidad de asistencias',
    valor: (m) => m.asistidos,
    formato: (v) => v,
    mejor: 'asistencias',
  },
  asistencia: {
    titulo: 'Porcentaje de asistencia',
    valor: (m) => m.porcentaje_asistencia,
    formato: (v) => `${v}%`,
    mejor: null,
  },
  inscripciones: {
    titulo: 'Nuevos inscriptos',
    valor: (m) => m.nuevos_inscriptos,
    formato: (v) => v,
    mejor: 'inscripciones',
  },
};

const abreviar = (nombre) => nombre.slice(0, 3);

// Evolución mes a mes de un año, con el mejor mes resaltado y la comparación año a año
export default function Evolucion({ metricaInicial = 'recaudacion' }) {
  const [anio, setAnio] = useState(null);
  const [metrica, setMetrica] = useState(metricaInicial);
  const [datos, setDatos] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    api.get('/dashboard/evolucion', { params: anio ? { anio } : {} })
      .then(({ data }) => {
        setDatos(data);
        setAviso(null);
      })
      .catch((error) => setAviso({ tipo: 'error', texto: mensajeDeError(error) }));
  }, [anio]);

  if (!datos) return aviso ? <Aviso aviso={aviso} /> : <p className="cargando">Cargando…</p>;

  const m = METRICAS[metrica];
  const meses = datos.meses;
  const mejorMes = m.mejor ? datos.mejor_mes[m.mejor] : null;

  // Para el porcentaje, el mejor mes es el de mayor porcentaje de asistencia con datos
  const mejorPorcentaje = metrica === 'asistencia'
    ? meses.filter((x) => x.asistidos + x.ausentes > 0).reduce((a, b) => (!a || b.porcentaje_asistencia > a.porcentaje_asistencia ? b : a), null)
    : null;
  const indiceDestacado = mejorMes ? mejorMes.mes - 1 : mejorPorcentaje ? mejorPorcentaje.mes - 1 : null;

  const t = datos.totales_anio;
  const totalAsist = t.asistidos + t.ausentes;

  return (
    <>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <div className="form form--compacto estadisticas__filtros">
        <label className="campo">
          Año
          <select value={datos.anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {datos.anios.map((a) => <option key={a.anio} value={a.anio}>{a.anio}</option>)}
          </select>
        </label>
        <div className="campo campo--ancho">
          Ver
          <div className="casillas">
            {Object.entries(METRICAS).map(([id, info]) => (
              <button
                key={id}
                type="button"
                className={`chip-periodo${metrica === id ? ' is-active' : ''}`}
                onClick={() => setMetrica(id)}
              >
                {info.titulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tarjetas">
        <Tarjeta titulo={`Recaudación ${datos.anio}`} valor={formatearPrecio(t.recaudacion)} />
        <Tarjeta
          titulo={`Cantidad de asistencias ${datos.anio}`}
          valor={t.asistidos}
          detalle={`Porcentaje de asistencia: ${totalAsist ? Math.round((t.asistidos / totalAsist) * 1000) / 10 : 0}%`}
        />
        <Tarjeta titulo={`Nuevos inscriptos ${datos.anio}`} valor={t.nuevos_inscriptos} />
        <Tarjeta
          titulo={metrica === 'asistencia' ? 'Mes con mayor porcentaje de asistencia' : `Mejor mes en ${m.titulo.toLowerCase()}`}
          valor={mejorMes ? mejorMes.nombre : mejorPorcentaje ? mejorPorcentaje.nombre : '-'}
          detalle={mejorMes ? m.formato(mejorMes.valor) : mejorPorcentaje ? `${mejorPorcentaje.porcentaje_asistencia}%` : 'Sin datos todavía'}
        />
      </div>

      <section className="panel-dato panel-dato--ancho">
        <h3 className="panel-dato__titulo">{m.titulo} mes a mes, {datos.anio}</h3>
        <Columnas
          datos={meses}
          valor={m.valor}
          etiqueta={(x) => abreviar(x.nombre)}
          formato={m.formato}
          destacado={indiceDestacado}
          apagado={(x) => x.futuro}
        />
        <p className="form__nota">El mes resaltado es el de mayor valor. Los meses que todavía no llegaron aparecen atenuados.</p>
      </section>

      <section className="seccion">
        <h3 className="seccion__titulo">Detalle por mes</h3>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Recaudación</th>
                <th>Pagos</th>
                <th>Cantidad de asistencias</th>
                <th>Ausencias</th>
                <th>Porcentaje de asistencia</th>
                <th>Nuevos inscriptos</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((x) => (
                <tr key={x.mes} className={x.futuro ? 'is-inactivo' : ''}>
                  <td>{x.nombre}</td>
                  <td className={datos.mejor_mes.recaudacion?.mes === x.mes ? 'celda-mejor' : ''}>{formatearPrecio(x.recaudacion)}</td>
                  <td>{x.pagos}</td>
                  <td className={datos.mejor_mes.asistencias?.mes === x.mes ? 'celda-mejor' : ''}>{x.asistidos}</td>
                  <td>{x.ausentes}</td>
                  <td>{x.asistidos + x.ausentes ? `${x.porcentaje_asistencia}%` : '-'}</td>
                  <td className={datos.mejor_mes.inscripciones?.mes === x.mes ? 'celda-mejor' : ''}>{x.nuevos_inscriptos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="form__nota">En negrita, el mejor mes del año en recaudación, asistencias e inscripciones.</p>
      </section>

      <section className="seccion">
        <h3 className="seccion__titulo">Año a año</h3>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Año</th>
                <th>Recaudación</th>
                <th>Pagos</th>
                <th>Cantidad de asistencias</th>
                <th>Porcentaje de asistencia</th>
                <th>Nuevos inscriptos</th>
              </tr>
            </thead>
            <tbody>
              {datos.anios.map((a) => (
                <tr key={a.anio}>
                  <td>{a.anio}</td>
                  <td>{formatearPrecio(a.recaudacion)}</td>
                  <td>{a.pagos}</td>
                  <td>{a.asistidos}</td>
                  <td>{a.asistidos + a.ausentes ? `${a.porcentaje_asistencia}%` : '-'}</td>
                  <td>{a.nuevos_inscriptos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}