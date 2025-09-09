import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <nav>
          <div className="nav-links">
            <Link to="/">Home</Link>
            {/* Prikazujemo link ka profilu samo ako je korisnik ulogovan */}
            {user && <Link to="/profile">Profile</Link>}
            {/* Prikazujemo admin link samo ako je korisnik admin */}
            {user && user.role === 'admin' && <Link to="/admin">Admin Panel</Link>}
          </div>

          <div className="user-actions">
            {user ? (
              <>
                {/* Prikazujemo ime korisnika */}
                <span>Welcome, {user.username}</span>
                <button onClick={handleLogout} className="logout-button">Logout</button>
              </>
            ) : (
              <>
                <Link to="/register">Register</Link>
                <Link to="/login">Login</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 SugarBeet DApp. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Layout;