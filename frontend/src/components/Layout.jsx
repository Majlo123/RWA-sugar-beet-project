import { Outlet, Link } from "react-router-dom";

function Layout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <nav>
          <Link to="/">Home</Link>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
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