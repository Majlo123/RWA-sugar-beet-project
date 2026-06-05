import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, CreditCard, Bitcoin, Wallet, QrCode, Loader2, ShieldCheck, Info, Check } from 'lucide-react';
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
    <div className="page-container py-12 space-y-8 animate-fade-in">
      <div>
        <span className="eyebrow mb-3 inline-flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" /> Token Purchase
        </span>
        <h1 className="text-4xl sm:text-6xl mt-4">Buy BEET Tokens</h1>
        <p className="text-lg text-muted mt-4 max-w-2xl">
          Each BEET token represents $1,000 invested into sugar beet production.
          Tokens are minted to your wallet automatically after the payment is confirmed.
        </p>
      </div>

      {!kycVerified && (
        <div className="alert-warning flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-honey-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-display font-semibold">KYC verification required</p>
            <p className="text-sm mt-1 opacity-90">
              Complete your KYC verification before purchasing tokens.
              <a href="/kyc" className="ml-1 underline font-semibold">Go to KYC →</a>
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="card-padded space-y-7">
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
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      Number(tokenCount) === n
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'bg-surface border-line-strong text-muted hover:border-brand-300 hover:text-brand-700'
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
                  const active = method === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={`relative text-left p-4 rounded-xl border transition-all flex gap-3 items-start ${
                        active
                          ? 'border-brand-400 bg-brand-50 shadow-soft'
                          : 'border-line-strong bg-surface hover:border-brand-300'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-100' : 'bg-cream-deep'}`}>
                        <IconCmp className={`w-5 h-5 ${active ? 'text-brand-700' : 'text-muted'}`} />
                      </span>
                      <div>
                        <p className="font-display font-semibold text-ink">{label}</p>
                        <p className="text-xs text-muted mt-0.5">{description}</p>
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
              className="btn-primary w-full text-base py-3.5"
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
          <div className="card-padded lg:sticky lg:top-24">
            <h3 className="section-title mb-4">Order summary</h3>
            <div className="space-y-3.5 text-base">
              <Row label="Tokens" value={`${tokenCount || '0'} BEET`} />
              <Row label="Price per token" value="$1,000" />
              <Row label="Method" value={METHODS.find((m) => m.id === method)?.label ?? '—'} />
              <div className="h-px bg-line my-2" />
              <div className="flex items-center justify-between">
                <span className="text-ink font-display font-semibold">Total</span>
                <span className="font-display text-2xl font-semibold gradient-text">
                  ${amountUSD.toLocaleString()} USD
                </span>
              </div>
            </div>
          </div>

          <div className="card-padded bg-surface-soft">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-4.5 h-4.5 text-brand-600" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-ink mb-1">How it works</h4>
                <p className="text-sm text-muted leading-relaxed">
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
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

export default BuyTokensPage;
