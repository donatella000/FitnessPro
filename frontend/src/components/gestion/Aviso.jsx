// Mensaje de confirmación o error que se muestra arriba de cada sección.
// aviso = { tipo: 'ok' | 'error', texto: '...' } o null
export default function Aviso({ aviso, onCerrar }) {
  if (!aviso) return null;

  return (
    <div className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
      <span>{aviso.texto}</span>
      {onCerrar && (
        <button type="button" className="aviso__cerrar" onClick={onCerrar} aria-label="Cerrar mensaje">
          ×
        </button>
      )}
    </div>
  );
}