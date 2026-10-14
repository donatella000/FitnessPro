import api from './api';

// Datos públicos del gimnasio (actividades, profesores y horarios).
// Se piden una sola vez por carga de página y los comparten
// la sección de Actividades y la de Nuestro equipo.
let pedido = null;

export function obtenerEquipo() {
  if (!pedido) {
    pedido = api
      .get('/publico/equipo')
      .then(({ data }) => data)
      .catch((error) => {
        pedido = null; // si falla, se puede volver a intentar
        throw error;
      });
  }
  return pedido;
}

// Agrupa horarios con la misma franja: "Lunes, miércoles y viernes · 08:00 - 09:00"
export function agruparHorarios(horarios, conProfesor = false) {
  const grupos = new Map();

  for (const h of horarios) {
    const clave = `${h.hora_inicio}-${h.hora_fin}${conProfesor ? `-${h.profesor}` : ''}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, { hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, profesor: h.profesor, dias: [] });
    }
    grupos.get(clave).dias.push(h);
  }

  return [...grupos.values()]
    .map((g) => {
      const dias = g.dias.sort((a, b) => a.dia_semana - b.dia_semana);
      const nombres = dias.map((d, i) => (i === 0 ? d.dia_nombre : d.dia_nombre.toLowerCase()));
      const texto = nombres.length > 1
        ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
        : nombres[0];
      return { ...g, primerDia: dias[0].dia_semana, diasTexto: texto, horario: `${g.hora_inicio} - ${g.hora_fin}` };
    })
    .sort((a, b) => a.primerDia - b.primerDia || a.hora_inicio.localeCompare(b.hora_inicio));
}