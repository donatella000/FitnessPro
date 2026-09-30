import { useState } from 'react';
import '../styles/TeamSection.css';

/*
 * Datos de ejemplo. Reemplazá nombres, días, horarios y profesores
 * por los reales del gimnasio. "profesor" en cada horario indica quién
 * dicta esa clase puntual.
 */
const TEAM = {
  musculacion: {
    label: 'Musculación',
    profesores: ['Profe Marcos', 'Profe Cristian', 'Profe Paula'],
    horarios: [
      { dia: 'Lunes y miércoles', horario: '08:00 - 09:00', profesor: 'Profe Marcos' },
      { dia: 'Lunes y miércoles', horario: '18:00 - 19:00', profesor: 'Profe Cristian' },
      { dia: 'Martes y jueves', horario: '10:00 - 11:00', profesor: 'Profe Paula' },
      { dia: 'Viernes', horario: '17:00 - 18:00', profesor: 'Profe Marcos' },
    ],
  },
  yoga: {
    label: 'Yoga',
    profesores: ['Profe Matias', 'Profe Milagros', 'Profe Angie'],
    horarios: [
      { dia: 'Lunes y jueves', horario: '07:30 - 08:30', profesor: 'Profe Matias' },
      { dia: 'Martes y viernes', horario: '19:00 - 20:00', profesor: 'Profe Milagros' },
      { dia: 'Miércoles', horario: '09:00 - 10:00', profesor: 'Profe Angie' },
    ],
  },
  pilates: {
    label: 'Pilates reformer',
    profesores: ['Profe Victor', 'Profe Ivan', 'Profe Rafael'],
    horarios: [
      { dia: 'Lunes y miércoles', horario: '09:00 - 10:00', profesor: 'Profe Victor '},
      { dia: 'Martes y jueves', horario: '17:00 - 18:00', profesor: 'Profe ivan'  },
      { dia: 'Viernes', horario: '11:00 - 12:00', profesor: 'Profe Rafael' },
    ],
  },
  spinning: {
    label: 'Spinning',
    profesores: ['Profe Baltazar', 'Profe Joshue', 'Profe Tomas'],
    horarios: [
      { dia: 'Lunes, miércoles y viernes', horario: '19:30 - 20:30', profesor: 'Profe Baltazar' },
      { dia: 'Martes y jueves', horario: '07:00 - 08:00', profesor: 'Profe Joshue' },
      { dia: 'Sábado', horario: '10:00 - 11:00', profesor: 'Profe Tomas' },
    ],
  },
};

const TABS = ['musculacion', 'yoga', 'pilates', 'spinning'];

function PersonIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="18" r="10" />
      <path d="M32 30c-8 0-14 8-16 20h10l3-10 3 10h0l3-10 3 10h10c-2-12-8-20-16-20z" />
    </svg>
  );
}

export default function TeamSection() {
  const [activeTab, setActiveTab] = useState('musculacion');
  const [showSchedule, setShowSchedule] = useState(false);
  const activity = TEAM[activeTab];

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setShowSchedule(false);
  };

  return (
    <section id="equipo" className="team">
      <h2 className="team__title">Nuestro equipo</h2>

      <div className="team__tabs" role="tablist" aria-label="Actividades">
        {TABS.map((tabId) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={activeTab === tabId}
            className={activeTab === tabId ? 'is-active' : ''}
            onClick={() => selectTab(tabId)}
          >
            {TEAM[tabId].label}
          </button>
        ))}
      </div>

      <div className="team__panel">
        <h3 className="team__activity">{activity.label}</h3>

        <div className="team__profs">
          {activity.profesores.map((nombre) => (
            <div className="team__profcard" key={nombre}>
              <div className="team__tombstone">
                <PersonIcon />
              </div>
              <span className="team__profname">{nombre.toUpperCase()}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn-pill team__toggle"
          aria-expanded={showSchedule}
          onClick={() => setShowSchedule((v) => !v)}
        >
          {showSchedule ? 'Ocultar horarios' : 'Ver horarios'}
        </button>

        {showSchedule && (
          <div className="team__schedule">
            <table>
              <thead>
                <tr>
                  <th scope="col">Días</th>
                  <th scope="col">Horario</th>
                  <th scope="col">Profesor</th>
                </tr>
              </thead>
              <tbody>
                {activity.horarios.map((h, i) => (
                  <tr key={`${h.dia}-${h.horario}-${i}`}>
                    <td>{h.dia}</td>
                    <td>{h.horario}</td>
                    <td>{h.profesor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
