import { Outlet, NavLink, Link } from "react-router-dom";
import { Wallet, LogOut, ShieldCheck, User as UserIcon, ArrowUpRight, UserCheck, Coins, History } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BeetLogo from "./BeetLogo";

function Layout() {
  const { user, account, logout, connectWallet } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const navLinkClass = ({ isActive }) =>
    `px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'text-brand-700 bg-brand-50'
        : 'text-muted hover:text-ink hover:bg-cream-deep'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/80 border-b border-line">
        <div className="page-container">
          <div className="flex items-center justify-between h-[72px]">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 drop-shadow-sm">
                <BeetLogo size={42} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-[26px] font-semibold text-ink tracking-tight">BEET</span>
                <span className="text-[10px] text-muted tracking-[0.2em] uppercase font-semibold mt-1">Sugar Beet Tokenization</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>Home</NavLink>
              {user && user.role !== 'admin' && <NavLink to="/profile" className={navLinkClass}>Dashboard</NavLink>}
              {user && user.role !== 'admin' && (
                <NavLink to="/buy-tokens" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    Buy Tokens
                  </span>
                </NavLink>
              )}
              {user && user.role !== 'admin' && (
                <NavLink to="/payments/history" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Payments
                  </span>
                </NavLink>
              )}
              {user && user.role !== 'admin' && (
                <NavLink to="/kyc" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    KYC
                    {user.kycStatus !== 'verified' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-honey-500 animate-pulse" />
                    )}
                  </span>
                </NavLink>
              )}
              {user?.role === 'admin' && <NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink>}
              {user?.role === 'admin' && (
                <NavLink to="/admin/kyc" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    KYC Reviews
                  </span>
                </NavLink>
              )}
            </nav>

            <div className="flex items-center gap-2.5">
              {user ? (
                <>
                  {user.role !== 'admin' && (!account ? (
                    <button
                      onClick={connectWallet}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm bg-surface text-ink border border-line-strong shadow-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all"
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">Connect Wallet</span>
                    </button>
                  ) : (
                    <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-sm font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                      {account.substring(0, 6)}…{account.substring(account.length - 4)}
                    </div>
                  ))}
                  <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cream-deep border border-line text-ink-soft text-sm font-medium">
                    {user.role === 'admin' ? <ShieldCheck className="w-4 h-4 text-honey-600" /> : <UserIcon className="w-4 h-4 text-brand-500" />}
                    {user.username}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm text-muted hover:text-ink hover:bg-cream-deep transition-colors"
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm text-muted hover:text-ink hover:bg-cream-deep transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 font-semibold text-sm text-white shadow-soft transition-all hover:-translate-y-0.5"
                    style={{ backgroundImage: 'linear-gradient(180deg, var(--color-brand-500), var(--color-brand-600))' }}
                  >
                    Get Started <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {user && (
            <nav className="md:hidden flex items-center gap-1 pb-2.5 overflow-x-auto">
              <NavLink to="/" end className={navLinkClass}>Home</NavLink>
              {user.role !== 'admin' && <NavLink to="/profile" className={navLinkClass}>Dashboard</NavLink>}
              {user.role !== 'admin' && <NavLink to="/buy-tokens" className={navLinkClass}>Buy</NavLink>}
              {user.role !== 'admin' && <NavLink to="/payments/history" className={navLinkClass}>Payments</NavLink>}
              {user.role !== 'admin' && <NavLink to="/kyc" className={navLinkClass}>KYC</NavLink>}
              {user.role === 'admin' && <NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink>}
              {user.role === 'admin' && <NavLink to="/admin/kyc" className={navLinkClass}>KYC</NavLink>}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-line mt-24 bg-surface-soft">
        <div className="page-container py-12">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BeetLogo size={36} />
                <div className="flex flex-col leading-none">
                  <span className="font-display text-xl font-semibold text-ink">BEET</span>
                  <span className="text-[10px] text-muted tracking-[0.2em] uppercase font-semibold mt-1">Sugar Beet Tokenization</span>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-sm">
                Real-world sugar beet production, tokenized as ERC-20 BEET on Polygon.
                Transparent, non-custodial, on-chain yield.
              </p>
            </div>

            <div>
              <p className="section-title mb-4">Platform</p>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/" className="text-muted hover:text-brand-700 transition-colors">Home</Link></li>
                <li><Link to="/register" className="text-muted hover:text-brand-700 transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="text-muted hover:text-brand-700 transition-colors">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <p className="section-title mb-4">Resources</p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="https://github.com/Majlo123/RWA-sugar-beet-project" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-brand-700 transition-colors">
                    GitHub <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a href="https://polygonscan.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-brand-700 transition-colors">
                    Polygonscan <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
            <span>© 2026 BEET — Sugar Beet Tokenization</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-beet-500" />
              <span className="uppercase tracking-[0.16em] text-xs font-semibold text-faint">Built on Polygon PoS</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
