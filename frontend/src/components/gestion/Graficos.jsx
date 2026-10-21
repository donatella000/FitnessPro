// Gráficos simples hechos con HTML y CSS (sin librerías)

// Barras horizontales. Con "completo" las etiquetas se muestran enteras
// (se usa en las vistas de detalle); sin él se recortan para el resumen.
export function Barras({ datos, etiqueta, valor, formato = (v) => v, vacio = 'Sin datos en el período.', completo = false }) {
  if (!datos || datos.length === 0) return <p className="seccion__ayuda">{vacio}</p>;
  const maximo = Math.max(...datos.map((d) => Number(valor(d)) || 0), 1);

  return (
    <ul className={`barras${completo ? ' barras--completo' : ''}`}>
      {datos.map((d, i) => {
        const v = Number(valor(d)) || 0;
        return (
          <li key={i} className="barras__fila">
            <span className="barras__etiqueta" title={etiqueta(d)}>{etiqueta(d)}</span>
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

// Columnas verticales, una por mes. "destacado" es el índice que se resalta.
export function Columnas({ datos, valor, etiqueta, formato = (v) => v, destacado = null, apagado = () => false, compacto = false }) {
  const maximo = Math.max(...datos.map((d) => Number(valor(d)) || 0), 1);

  return (
    <div className={`columnas${compacto ? ' columnas--compacto' : ''}`}>
      {datos.map((d, i) => {
        const v = Number(valor(d)) || 0;
        const clases = ['columnas__item'];
        if (i === destacado) clases.push('is-destacado');
        if (apagado(d)) clases.push('is-apagado');
        return (
          <div key={i} className={clases.join(' ')}>
            {!compacto && <span className="columnas__valor">{v ? formato(v, d) : ''}</span>}
            <span className="columnas__pista">
              <span className="columnas__barra" style={{ height: `${(v / maximo) * 100}%` }} />
            </span>
            <span className="columnas__etiqueta">{etiqueta(d)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Tarjeta con un número principal. Si recibe onClick, se puede tocar para ver el detalle.
export function Tarjeta({ titulo, valor, detalle, onClick }) {
  const contenido = (
    <>
      <span className="tarjeta__titulo">{titulo}</span>
      <strong className="tarjeta__valor">{valor}</strong>
      {detalle && <span className="tarjeta__detalle">{detalle}</span>}
      {onClick && <span className="tarjeta__ver">Ver detalle</span>}
    </>
  );

  return onClick ? (
    <button type="button" className="tarjeta tarjeta--clic" onClick={onClick}>{contenido}</button>
  ) : (
    <div className="tarjeta">{contenido}</div>
  );
}

// Panel del resumen que abre su vista de detalle al tocarlo
export function PanelDato({ titulo, onClick, children }) {
  return (
    <section className="panel-dato">
      <div className="panel-dato__cabecera">
        <h3 className="panel-dato__titulo">{titulo}</h3>
        {onClick && (
          <button type="button" className="panel-dato__ver" onClick={onClick}>Ver detalle</button>
        )}
      </div>
      {children}
    </section>
  );
}