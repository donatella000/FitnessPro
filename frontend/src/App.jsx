import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/restablecer-password" element={<ResetPassword />} />
        <Route path="/cambiar-password" element={<ChangePassword />} />
      </Routes>
    </AuthProvider>
  );
}