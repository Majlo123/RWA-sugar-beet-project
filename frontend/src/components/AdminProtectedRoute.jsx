import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminProtectedRoute() {
  const { user } = useAuth();

  // Ako korisnik nije ulogovan, ili ako jeste ali nije admin, preusmeri ga.
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;