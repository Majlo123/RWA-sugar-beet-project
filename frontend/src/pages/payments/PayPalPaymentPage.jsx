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
        <span className="eyebrow mb-3 inline-flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" /> PayPal
        </span>
        <h1 className="text-4xl sm:text-5xl mt-4">PayPal Sandbox</h1>
        <p className="text-lg text-muted mt-4">
          You are about to pay <span className="font-display font-semibold text-ink">${Number(payment.amountUSD).toLocaleString()}</span>
          {' '}via PayPal sandbox. Click <em>Pay with PayPal</em> to authorize the transaction.
        </p>
      </div>

      <div className="card-padded space-y-5">
        <div className="flex items-center gap-4 p-5 rounded-xl bg-[#eaf0f8] border border-[#cfdcef]">
          <div className="w-14 h-14 rounded-full bg-white border border-[#cfdcef] flex items-center justify-center shadow-soft">
            <span className="font-display font-bold text-2xl text-[#003087]">P</span>
            <span className="font-display font-bold text-2xl text-[#0070ba] -ml-1">P</span>
          </div>
          <div>
            <p className="font-display font-semibold text-ink">Pay with PayPal</p>
            <p className="text-sm text-muted">sandbox.paypal.com</p>
          </div>
        </div>

        <div className="space-y-3 text-base">
          <Row label="Order" value={<span className="font-mono text-xs">{payment.merchantOrderId}</span>} />
          <Row label="Amount" value={`$${Number(payment.amountUSD).toLocaleString()} USD`} />
        </div>

        <div className="flex gap-3">
          <button onClick={handleCancel} type="button" className="btn-secondary flex-1">
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
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

export default PayPalPaymentPage;
