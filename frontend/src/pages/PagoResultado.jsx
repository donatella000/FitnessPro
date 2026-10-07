import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api, { mensajeDeError } from '../services/api';
import '../styles/Dashboard.css';
import '../styles/Panel.css';

const TEXTOS = {
  exitoso: 'Estamos confirmando tu pago…',
  pendiente: 'Tu pago quedó pendiente de acreditación. Cuando se acredite, tu abono se activa solo.',
  fallido: 'El pago no se pudo completar. Podés intentarlo de nuevo desde la sección Pagos.',
};

// Página a la que vuelve Mercado Pago después de pagar.
// Mercado Pago agrega a la dirección el parámetro payment_id, que se manda
// al backend para que verifique el pago y active la suscripción.
export default function PagoResultado({ tipo }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');

  const [mensaje, setMensaje] = useState(TEXTOS[tipo]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || !paymentId || paymentId === 'null') return;

    api.post('/pagos/confirmar', { payment_id: paymentId })
      .then(({ data }) => {
        setMensaje(data.mensaje);
        setError(data.estado === 'rechazado');
      })
      .catch((err) => {
        setMensaje(mensajeDeError(err));
        setError(true);
      });
  }, [user, paymentId]);

  return (
    <>
      <Navbar />
      <main className="dash">
        <h1 className="dash__title">Resultado del pago</h1>
        <p className={`dash__status${error || tipo === 'fallido' ? ' dash__status--error' : ''}`}>
          {user ? mensaje : 'Iniciá sesión para ver el estado de tu pago.'}
        </p>
        <Link to="/dashboard?vista=alumno&seccion=inicio" className="btn-pill">
          Ir a mi panel
        </Link>
      </main>
    </>
  );
}