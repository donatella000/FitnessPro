const db = require('../config/db');

const NOMBRES_DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const hhmm = (hora) => String(hora).slice(0, 5);

// ==========================================================
// EQUIPO Y HORARIOS (público, sin sesión)
// ==========================================================
// GET /api/publico/equipo
// Devuelve las actividades activas con sus profesores activos y los
// horarios de cada uno. Lo usa la portada para que cualquier visitante
// vea la oferta del gimnasio. Solo expone nombre y apellido del profesor.
//
// - Actividades con profesor: horarios de las clases que dicta.
// - Musculación: turnos de trabajo del profesor en la sala, y además
//   la grilla general de la sala en "horarios_sala".
const obtenerEquipo = async (req, res) => {
  try {
    const [actividades] = await db.query(`
      SELECT id_actividad, nombre, descripcion, tipo, icono
      FROM actividades
      WHERE activo = 1
      ORDER BY (tipo = 'musculacion') DESC, nombre
    `);

    // Horarios de las clases con profesor
    const [deClases] = await db.query(`
      SELECT c.id_actividad, u.id_usuario AS id_profesor, u.nombre, u.apellido, u.foto,
             h.dia_semana, h.hora_inicio, h.hora_fin
      FROM clases c
      INNER JOIN usuarios u ON c.id_profesor = u.id_usuario
      LEFT JOIN horarios_clase h ON h.id_clase = c.id_clase AND h.activo = 1
      WHERE c.activo = 1 AND u.activo = 1
      ORDER BY u.nombre, h.dia_semana, h.hora_inicio
    `);

    // Turnos de los profesores de sala
    const [deSala] = await db.query(`
      SELECT ps.id_actividad, u.id_usuario AS id_profesor, u.nombre, u.apellido, u.foto,
             ps.dia_semana, ps.hora_inicio, ps.hora_fin
      FROM profesores_sala ps
      INNER JOIN usuarios u ON ps.id_profesor = u.id_usuario
      WHERE u.activo = 1
      ORDER BY u.nombre, ps.dia_semana, ps.hora_inicio
    `);

    // Grilla general de la sala (para mostrar el horario de apertura)
    const [sala] = await db.query(`
      SELECT c.id_actividad, h.dia_semana, MIN(h.hora_inicio) AS desde, MAX(h.hora_fin) AS hasta
      FROM horarios_clase h
      INNER JOIN clases c ON h.id_clase = c.id_clase
      INNER JOIN actividades a ON c.id_actividad = a.id_actividad
      WHERE a.tipo = 'musculacion' AND c.activo = 1 AND h.activo = 1
      GROUP BY c.id_actividad, h.dia_semana
      ORDER BY h.dia_semana
    `);

    const resultado = actividades.map((a) => {
      const filas = (a.tipo === 'musculacion' ? deSala : deClases).filter((f) => f.id_actividad === a.id_actividad);

      // Agrupar los horarios por profesor
      const profesores = [];
      for (const f of filas) {
        let profe = profesores.find((p) => p.id_profesor === f.id_profesor);
        if (!profe) {
          profe = { id_profesor: f.id_profesor, nombre: f.nombre, apellido: f.apellido, foto: f.foto || null, horarios: [] };
          profesores.push(profe);
        }
        if (f.dia_semana) {
          profe.horarios.push({
            dia_semana: f.dia_semana,
            dia_nombre: NOMBRES_DIAS[f.dia_semana],
            hora_inicio: hhmm(f.hora_inicio),
            hora_fin: hhmm(f.hora_fin)
          });
        }
      }

      const item = { ...a, profesores };
      if (a.tipo === 'musculacion') {
        item.horarios_sala = sala
          .filter((s) => s.id_actividad === a.id_actividad)
          .map((s) => ({
            dia_semana: s.dia_semana,
            dia_nombre: NOMBRES_DIAS[s.dia_semana],
            hora_inicio: hhmm(s.desde),
            hora_fin: hhmm(s.hasta)
          }));
      }
      return item;
    });

    return res.json(resultado);
  } catch (error) {
    console.error('Error al obtener el equipo:', error);
    return res.status(500).json({ mensaje: 'No se pudo cargar la información del gimnasio.' });
  }
};

// ==========================================================
// TEMA DE COLORES ACTIVO (público, sin sesión)
// ==========================================================
// GET /api/publico/tema -> { tema: 'navidad' }
// Lo elige el admin desde el panel; si nunca se eligió, es 'normal'.
const obtenerTema = async (req, res) => {
  try {
    const [filas] = await db.query("SELECT valor FROM configuracion WHERE clave = 'tema'");
    return res.json({ tema: filas.length ? filas[0].valor : 'normal' });
  } catch (error) {
    console.error('Error al obtener el tema:', error);
    return res.json({ tema: 'normal' });
  }
};

module.exports = { obtenerEquipo, obtenerTema };
