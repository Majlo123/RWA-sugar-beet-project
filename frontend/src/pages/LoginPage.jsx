import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import BeetLogo from '../components/BeetLogo';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginUser({ username, password });
      if (data.token) {
        await login(data.token);
        navigate('/profile');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-14 animate-fade-in">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="blob bg-brand-200/30 w-[460px] h-[460px] -top-20 -left-16" />
        <div className="blob bg-honey-200/30 w-[420px] h-[420px] bottom-0 right-0" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-9">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-surface border border-line shadow-card items-center justify-center mb-6">
            <BeetLogo size={48} />
          </div>
          <h1 className="text-4xl sm:text-5xl mb-3">Welcome back</h1>
          <p className="text-lg text-muted">Sign in to manage your BEET investments.</p>
        </div>

        <div className="card-padded">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-[13px] text-faint font-medium">
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-500" /> Encrypted</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand-500" /> Non-custodial</span>
        </div>

        <p className="text-center text-base text-muted mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
