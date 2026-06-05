import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, CreditCard, Bitcoin, Wallet, QrCode, Loader2, ShieldCheck, Info } from 'lucide-react';
import { initiatePayment } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';

const METHODS = [
  { id: 'BANK',   label: 'Card / Bank',  description: 'Visa, MasterCard or local card',     Icon: CreditCard },
  { id: 'PAYPAL', label: 'PayPal',       description: 'PayPal sandbox flow',                 Icon: Wallet     },
  { id: 'CRYPTO', label: 'Crypto',       description: 'Pay with POL on Polygon',             Icon: Bitcoin    },
  { id: 'QR',     label: 'QR Code',      description: 'Scan with a mobile banking app',      Icon: QrCode     },
];

const SUGGESTED = [1, 2, 5, 10, 25];

function BuyTokensPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tokenCount, setTokenCount] = useState('1');
  const [method, setMethod] = useState('BANK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amountUSD = useMemo(() => {
    const n = Number(tokenCount);
    return isNaN(n) || n <= 0 ? 0 : Math.floor(n) * 1000;
  }, [tokenCount]);

  const kycVerified = user?.kycStatus === 'verified';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!kycVerified) {
      setError('KYC must be verified before purchasing tokens.');
      return;
    }
    if (amountUSD === 0) {
      setError('Please enter a valid number of tokens.');
      return;
    }

    setLoading(true);
    try {
      const result = await initiatePayment({ amountUSD, paymentMethod: method });
      // PayPal returns a real sandbox.paypal.com URL — leave the SPA entirely.
      if (result.external) {
        window.location.href = result.redirectPath;
        return;
      }
      navigate(result.redirectPath, { state: { payment: result, amountUSD } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container py-12 space-y-8">
      <div>
        <span className="eyebrow-emerald mb-3 inline-flex items-center gap-1.5">
          <Coins className="w-4 h-4" /> Token Purchase
        </span>
        <h1 className="text-5xl sm:text-6xl">Buy BEET Tokens</h1>
        <p className="text-lg text-slate-400 mt-4 font-light max-w-2xl">
          Each BEET token represents $1,000 invested into sugar beet production.
          Tokens are minted to your wallet automatically after the payment is confirmed.
        </p>
      </div>

      {!kycVerified && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-amber-200">KYC verification required</p>
            <p className="text-sm text-amber-100/80 mt-1">
              Complete your KYC verification before purchasing tokens.
              <a href="/kyc" className="ml-1 underline font-semibold hover:text-amber-50">Go to KYC →</a>
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="card-padded space-y-6">
            <div>
              <label className="label" htmlFor="amount">Number of BEET tokens</label>
              <input
                id="amount"
                type="number"
                min="1"
                step="1"
                className="input"
                value={tokenCount}
                onChange={(e) => setTokenCount(e.target.value)}
                placeholder="e.g. 5"
                required
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTED.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTokenCount(String(n))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      Number(tokenCount) === n
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {n} BEET
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Payment method</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {METHODS.map(({ id, label, description, Icon }) => {
                  const IconCmp = Icon;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={`text-left p-4 rounded-xl border transition flex gap-3 items-start ${
                        method === id
                          ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                      }`}
                    >
                      <IconCmp className={`w-6 h-6 mt-0.5 ${method === id ? 'text-emerald-300' : 'text-slate-300'}`} />
                      <div>
                        <p className="font-display font-bold text-slate-100">{label}</p>
                        <p className="text-xs text-slate-400 mt-1">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button
              type="submit"
              disabled={loading || amountUSD === 0 || !kycVerified}
              className="btn-primary w-full text-base py-3"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Initiating payment…</>
              ) : (
                <><Coins className="w-4 h-4" /> Continue to payment</>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="card-padded">
            <h3 className="section-title mb-4">Order summary</h3>
            <div className="space-y-3 text-base">
              <Row label="Tokens" value={`${tokenCount || '0'} BEET`} />
              <Row label="Price per token" value="$1,000" />
              <Row label="Method" value={METHODS.find((m) => m.id === method)?.label ?? '—'} />
              <div className="h-px bg-slate-800 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-display font-semibold">Total</span>
                <span className="font-display text-2xl font-extrabold gradient-text">
                  ${amountUSD.toLocaleString()} USD
                </span>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-display font-bold text-slate-100 mb-1">How it works</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We process your payment through a PCI-DSS compliant Payment Service Provider.
                  Once payment is confirmed, the Treasury contract mints BEET tokens directly to
                  your wallet on the Polygon network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-medium">{value}</span>
    </div>
  );
}

export default BuyTokensPage;
