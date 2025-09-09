import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
  // Proveravamo da li token postoji u Local Storage-u
  const token = localStorage.getItem('token');

  // Ako token postoji, dozvoli pristup stranici (prikaži Outlet)
  // Ako ne postoji, preusmeri korisnika na /login
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;