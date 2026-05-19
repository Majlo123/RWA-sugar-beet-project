import { Outlet, NavLink, Link } from "react-router-dom";
import { Sprout, Wallet, LogOut, ShieldCheck, User as UserIcon, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, account, logout, connectWallet } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const navLinkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'text-emerald-300 bg-emerald-500/10'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0a0f1c]/70 border-b border-slate-800/80">
        <div className="page-container">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-2xl font-extrabold gradient-text tracking-tight">BEET</span>
                <span className="font-eyebrow text-[11px] text-slate-400 tracking-[0.15em] uppercase font-semibold mt-1">Sugar Beet DApp</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>Home</NavLink>
              {user && <NavLink to="/profile" className={navLinkClass}>Dashboard</NavLink>}
              {user?.role === 'admin' && <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>}
            </nav>

            <div className="flex items-center gap-2.5">
              {user ? (
                <>
                  {!account ? (
                    <button
                      onClick={connectWallet}
                      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">Connect Wallet</span>
                    </button>
                  ) : (
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {account.substring(0, 6)}…{account.substring(account.length - 4)}
                    </div>
                  )}
                  <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/50 text-slate-300 text-sm font-medium">
                    {user.role === 'admin' ? <ShieldCheck className="w-4 h-4 text-amber-400" /> : <UserIcon className="w-4 h-4" />}
                    {user.username}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

          {user && (
            <nav className="md:hidden flex items-center gap-1 pb-2">
              <NavLink to="/" end className={navLinkClass}>Home</NavLink>
              <NavLink to="/profile" className={navLinkClass}>Dashboard</NavLink>
              {user.role === 'admin' && <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 mt-20">
        <div className="page-container py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-slate-400 text-sm">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span className="font-display font-semibold text-slate-300">BEET — Sugar Beet Tokenization</span>
              <span className="text-slate-600">·</span>
              <span>© 2026 SugarBeet DApp</span>
            </div>
            <div className="flex items-center gap-5 text-sm text-slate-400">
              <a
                href="https://github.com/Majlo123/RWA-sugar-beet-project"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub
              </a>
              <span className="font-eyebrow uppercase tracking-[0.15em] text-xs font-semibold text-slate-500">Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
