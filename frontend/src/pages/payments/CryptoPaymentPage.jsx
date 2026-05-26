import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bitcoin, Copy, Loader2, AlertTriangle, Check } from 'lucide-react';
import { getPaymentById, simulatePayment } from '../../services/paymentService';

const DEMO_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const ETH_USD_RATE = 3500;

function CryptoPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [payment, setPayment] = useState(location.state?.payment ?? null);
  const [loading, setLoading] = useState(!payment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (payment) return;
    (async () => {
      try {
        setPayment(await getPaymentById(id));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, payment]);

  const ethAmount = useMemo(() => {
    if (!payment) return '0';
    return (payment.amountUSD / ETH_USD_RATE).toFixed(6);
  }, [payment]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await simulatePayment(id, 'PAID');
      navigate(`/payment-success?paymentId=${id}`);
    } catch (err) {
      navigate(`/payment-failed?paymentId=${id}&reason=${encodeURIComponent(err.message)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await simulatePayment(id, 'FAILED', 'USER_CANCELLED');
    } finally {
      navigate(`/payment-failed?paymentId=${id}&reason=USER_CANCELLED`);
    }
  };

  if (loading) {
    return (
      <div className="page-container py-20 flex items-center justify-center text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading…
      </div>
    );
  }
  if (!payment) {
    return <div className="page-container py-20"><div className="alert-error">{error || 'Payment not found.'}</div></div>;
  }
  if (payment.status !== 'PENDING') {
    return (
      <div className="page-container py-20">
        <div className="card-padded text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-2xl">This payment is no longer pending ({payment.status})</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-12 max-w-2xl mx-auto space-y-8">
      <div>
        <span className="eyebrow-amber mb-3 inline-flex items-center gap-1.5">
          <Bitcoin className="w-4 h-4" /> Crypto
        </span>
        <h1 className="text-5xl">Pay with Crypto</h1>
        <p className="text-lg text-slate-400 mt-4 font-light">
          Send the exact amount to the address below. The transaction is monitored on-chain.
        </p>
      </div>

      <div className="card-padded space-y-5">
        <div className="text-center p-6 rounded-xl bg-amber-500/5 border border-amber-500/30">
          <p className="font-eyebrow text-xs uppercase tracking-[0.15em] text-amber-300/80 mb-2 font-bold">Send</p>
          <p className="font-display text-4xl font-extrabold gradient-text">{ethAmount} ETH</p>
          <p className="text-sm text-slate-400 mt-1">≈ ${Number(payment.amountUSD).toLocaleString()} USD</p>
        </div>

        <div>
          <label className="label">Recipient address</label>
          <div className="flex gap-2">
            <input readOnly value={DEMO_ADDRESS} className="input font-mono text-xs" />
            <button onClick={copyAddress} type="button" className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-400">
          For diploma demo: clicking <em>I've sent it</em> simulates an on-chain confirmation without
          requiring a real transaction.
        </div>

        <div className="flex gap-3">
          <button onClick={handleCancel} type="button" className="px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition flex-1">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting} type="button" className="btn-primary flex-1 text-base py-3">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</> : <>I've sent it</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CryptoPaymentPage;
