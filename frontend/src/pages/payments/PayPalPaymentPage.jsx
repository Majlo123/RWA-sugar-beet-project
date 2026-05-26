import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Wallet, Loader2, AlertTriangle } from 'lucide-react';
import { getPaymentById, simulatePayment } from '../../services/paymentService';

function PayPalPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [payment, setPayment] = useState(location.state?.payment ?? null);
  const [loading, setLoading] = useState(!payment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const handlePay = async () => {
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
        <span className="eyebrow-emerald mb-3 inline-flex items-center gap-1.5">
          <Wallet className="w-4 h-4" /> PayPal
        </span>
        <h1 className="text-5xl">PayPal Sandbox</h1>
        <p className="text-lg text-slate-400 mt-4 font-light">
          You are about to pay <span className="font-display font-bold text-emerald-300">${Number(payment.amountUSD).toLocaleString()}</span>
          {' '}via PayPal sandbox. Click <em>Pay with PayPal</em> to authorize the transaction.
        </p>
      </div>

      <div className="card-padded space-y-5">
        <div className="flex items-center gap-4 p-5 rounded-xl bg-[#003087]/15 border border-[#0070ba]/40">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
            <span className="font-display font-extrabold text-2xl text-[#003087]">P</span>
            <span className="font-display font-extrabold text-2xl text-[#0070ba]">P</span>
          </div>
          <div>
            <p className="font-display font-bold text-slate-100">Pay with PayPal</p>
            <p className="text-sm text-slate-400">sandbox.paypal.com</p>
          </div>
        </div>

        <div className="space-y-2 text-base">
          <Row label="Order" value={<span className="font-mono text-xs">{payment.merchantOrderId}</span>} />
          <Row label="Amount" value={`$${Number(payment.amountUSD).toLocaleString()} USD`} />
        </div>

        <div className="flex gap-3">
          <button onClick={handleCancel} type="button" className="px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition flex-1">
            Cancel
          </button>
          <button onClick={handlePay} disabled={submitting} type="button" className="btn-primary flex-1 text-base py-3">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <>Pay with PayPal</>}
          </button>
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

export default PayPalPaymentPage;
