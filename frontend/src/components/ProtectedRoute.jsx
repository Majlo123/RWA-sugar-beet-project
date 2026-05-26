import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
  // Check whether a token exists in localStorage.
  const token = localStorage.getItem('token');

  // If a token exists, render the protected page (Outlet); otherwise
  // redirect the user to /login.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;