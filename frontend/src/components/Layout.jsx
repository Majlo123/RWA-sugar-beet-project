import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, account, logout, connectWallet } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
     window.location.href = '/login'; 
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <nav>
          <div className="nav-links">
            <Link to="/">Home</Link>
            {user && <Link to="/profile">Profile</Link>}
            {user && user.role === 'admin' && <Link to="/admin">Admin Panel</Link>}
          </div>

          <div className="user-actions">
            {user ? (
              <>
                <span>Welcome, {user.username}</span>
                
                {!account && (
                  <button onClick={connectWallet} className="logout-button">Connect Wallet</button>
                )}
                {account && (
                  <span>{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</span>
                )}

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