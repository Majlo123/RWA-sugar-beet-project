import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bitcoin, Copy, Loader2, AlertTriangle, Check } from 'lucide-react';
import { getPaymentById, simulatePayment } from '../../services/paymentService';

const DEMO_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const POL_USD_RATE = 0.45;

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

  const polAmount = useMemo(() => {
    if (!payment) return '0';
    return (payment.amountUSD / POL_USD_RATE).toFixed(2);
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
      <div className="page-container py-20 flex items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-brand-500" /> Loading…
      </div>
    );
  }
  if (!payment) {
    return <div className="page-container py-20"><div className="alert-error">{error || 'Payment not found.'}</div></div>;
  }
  if (payment.status !== 'PENDING') {
    return (
      <div className="page-container py-20">
        <div className="card-padded text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-honey-50 border border-honey-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-honey-600" />
          </div>
          <h2 className="text-2xl">This payment is no longer pending ({payment.status})</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-12 max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <span className="eyebrow-honey mb-3 inline-flex items-center gap-1.5">
          <Bitcoin className="w-3.5 h-3.5" /> Crypto
        </span>
        <h1 className="text-4xl sm:text-5xl mt-4">Pay with Crypto</h1>
        <p className="text-lg text-muted mt-4">
          Send the exact amount to the address below on the Polygon network. The transaction is monitored on-chain.
        </p>
      </div>

      <div className="card-padded space-y-5">
        <div className="text-center p-6 rounded-xl bg-honey-50 border border-honey-100">
          <p className="text-xs uppercase tracking-[0.15em] text-honey-700 mb-2 font-bold">Send</p>
          <p className="font-display text-4xl font-semibold text-honey-700">{polAmount} POL</p>
          <p className="text-sm text-muted mt-1">≈ ${Number(payment.amountUSD).toLocaleString()} USD</p>
        </div>

        <div>
          <label className="label">Recipient address</label>
          <div className="flex gap-2">
            <input readOnly value={DEMO_ADDRESS} className="input font-mono text-xs" />
            <button onClick={copyAddress} type="button" className="px-3.5 rounded-xl border border-line-strong text-muted bg-surface hover:border-brand-300 hover:text-brand-700 transition-colors flex items-center">
              {copied ? <Check className="w-4 h-4 text-brand-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-surface-soft border border-line p-4 text-sm text-muted">
          For diploma demo: clicking <em>I've sent it</em> simulates an on-chain confirmation without
          requiring a real transaction.
        </div>

        <div className="flex gap-3">
          <button onClick={handleCancel} type="button" className="btn-secondary flex-1">
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
