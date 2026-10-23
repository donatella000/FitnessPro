import { useSearchParams } from 'react-router-dom';
import UsuariosGestion from './UsuariosGestion';
import ActividadesGestion from './ActividadesGestion';
import ClasesGestion from './ClasesGestion';
import SuscripcionesGestion from './SuscripcionesGestion';
import CobrosGestion from './CobrosGestion';
import TurnosGestion from './TurnosGestion';
import RutinasGestion from './RutinasGestion';
import EjerciciosGestion from './EjerciciosGestion';
import PuntosGestion from './PuntosGestion';
import EstadisticasGestion from './EstadisticasGestion';
import AparienciaGestion from './AparienciaGestion';

// Pestañas del panel. Las marcadas con soloAdmin no aparecen en la vista de Profesor.
const PESTANIAS = [
  { id: 'estadisticas', admin: 'Estadísticas', soloAdmin: true },
  { id: 'usuarios', admin: 'Usuarios', profesor: 'Alumnos' },
  { id: 'turnos', admin: 'Turnos del día' },
  { id: 'cobros', admin: 'Cobros' },
  { id: 'rutinas', admin: 'Rutinas' },
  { id: 'ejercicios', admin: 'Ejercicios' },
  { id: 'puntos', admin: 'Premios y puntos' },
  { id: 'clases', admin: 'Clases y horarios', profesor: 'Mis clases y horarios' },
  { id: 'actividades', admin: 'Actividades', soloAdmin: true },
  { id: 'suscripciones', admin: 'Suscripciones', soloAdmin: true },
  { id: 'apariencia', admin: 'Apariencia', soloAdmin: true },
];

export default function PanelGestion({ esAdmin }) {
  const visibles = PESTANIAS.filter((p) => esAdmin || !p.soloAdmin);
  const [searchParams, setSearchParams] = useSearchParams();

  // La pestaña sale de la dirección (?seccion=clases), así el menú del usuario
  // puede abrir una sección directamente. Si no es válida, se abre la primera.
  const pedida = searchParams.get('seccion');
  const actual = visibles.some((p) => p.id === pedida) ? pedida : visibles[0].id;

  const setActiva = (id) => {
    setSearchParams((params) => {
      params.set('seccion', id);
      return params;
    });
  };

  return (
    <div className="panel">
      <div className="panel__tabs" role="tablist" aria-label="Secciones del panel">
        {visibles.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === actual}
            className={`panel__tab${p.id === actual ? ' is-active' : ''}`}
            onClick={() => setActiva(p.id)}
          >
            {esAdmin ? p.admin : p.profesor || p.admin}
          </button>
        ))}
      </div>

      {actual === 'estadisticas' && <EstadisticasGestion />}
      {actual === 'usuarios' && <UsuariosGestion esAdmin={esAdmin} />}
      {actual === 'turnos' && <TurnosGestion />}
      {actual === 'cobros' && <CobrosGestion esAdmin={esAdmin} />}
      {actual === 'rutinas' && <RutinasGestion />}
      {actual === 'ejercicios' && <EjerciciosGestion />}
      {actual === 'puntos' && <PuntosGestion />}
      {actual === 'clases' && <ClasesGestion esAdmin={esAdmin} />}
      {actual === 'actividades' && <ActividadesGestion />}
      {actual === 'suscripciones' && <SuscripcionesGestion />}
      {actual === 'apariencia' && <AparienciaGestion />}
    </div>
  );
}
