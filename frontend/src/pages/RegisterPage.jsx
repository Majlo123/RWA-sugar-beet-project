import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Loader2, Wallet, ShieldCheck, Lock } from 'lucide-react';
import { registerUser } from '../services/authService';
import BeetLogo from '../components/BeetLogo';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await registerUser({ username, password, ethAddress });
      setMessage(data.message);
      setUsername('');
      setPassword('');
      setEthAddress('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-14 animate-fade-in">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="blob bg-brand-200/30 w-[460px] h-[460px] -top-20 right-0" />
        <div className="blob bg-beet-100/40 w-[420px] h-[420px] bottom-0 -left-16" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-9">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-surface border border-line shadow-card items-center justify-center mb-6">
            <BeetLogo size={48} />
          </div>
          <h1 className="text-4xl sm:text-5xl mb-3">Create your account</h1>
          <p className="text-lg text-muted">Start your sugar beet investment journey.</p>
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
                placeholder="choose_a_username"
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
                autoComplete="new-password"
              />
              <p className="text-xs text-faint mt-1.5 font-medium">At least 8 characters recommended.</p>
            </div>

            <div>
              <label className="label flex items-center gap-1.5" htmlFor="ethAddress">
                <Wallet className="w-4 h-4 text-brand-500" />
                Ethereum Address
              </label>
              <input
                id="ethAddress"
                type="text"
                className="input font-mono text-sm"
                value={ethAddress}
                onChange={(e) => setEthAddress(e.target.value)}
                placeholder="0x…"
                required
              />
              <p className="text-xs text-faint mt-1.5 font-medium text-pretty">
                The wallet that will hold your BEET tokens. Must match MetaMask.
              </p>
            </div>

            {error && <div className="alert-error">{error}</div>}
            {message && <div className="alert-success">{message}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-[13px] text-faint font-medium">
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-500" /> Encrypted</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand-500" /> Non-custodial</span>
        </div>

        <p className="text-center text-base text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
