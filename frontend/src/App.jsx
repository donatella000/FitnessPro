import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TemaProvider } from './context/TemaContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import PagoResultado from './pages/PagoResultado';
import Molinete from './pages/Molinete';

export default function App() {
  return (
    <TemaProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/restablecer-password" element={<ResetPassword />} />
        <Route path="/cambiar-password" element={<ChangePassword />} />
        {/* Pantalla de la computadora de la entrada */}
        <Route path="/molinete" element={<Molinete />} />
        {/* Páginas a las que vuelve Mercado Pago */}
        <Route path="/pago-exitoso" element={<PagoResultado tipo="exitoso" />} />
        <Route path="/pago-pendiente" element={<PagoResultado tipo="pendiente" />} />
        <Route path="/pago-fallido" element={<PagoResultado tipo="fallido" />} />
      </Routes>
    </AuthProvider>
    </TemaProvider>
  );
}
