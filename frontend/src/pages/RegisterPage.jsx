import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, UserPlus, Loader2, Wallet } from 'lucide-react';
import { registerUser } from '../services/authService';

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
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-lg">
        <div className="text-center mb-12">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center shadow-xl shadow-emerald-500/30 mb-6">
            <Sprout className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl mb-3">Create your account</h1>
          <p className="text-xl text-slate-400 font-light">Start your sugar beet investment journey.</p>
        </div>

        <div className="card-padded">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-xs text-slate-500 mt-1.5 font-medium">At least 8 characters recommended.</p>
            </div>

            <div>
              <label className="label flex items-center gap-1.5" htmlFor="ethAddress">
                <Wallet className="w-4 h-4 text-emerald-400" />
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
              <p className="text-xs text-slate-500 mt-1.5 font-medium text-pretty">
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

        <p className="text-center text-base text-slate-400 mt-7">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
