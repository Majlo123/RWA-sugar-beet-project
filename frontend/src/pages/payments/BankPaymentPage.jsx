import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CreditCard, Loader2, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getPaymentById, submitBankPayment } from '../../services/paymentService';

const formatPan = (raw) => raw.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

function BankPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [payment, setPayment] = useState(location.state?.payment ?? null);
  const [loading, setLoading] = useState(!payment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [cardHolder, setCardHolder] = useState('');
  const [pan, setPan] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    if (payment) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPaymentById(id);
        if (!cancelled) setPayment(p);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, payment]);

  const merchantOrderId = payment?.merchantOrderId;
  const amount = payment?.amountUSD ?? location.state?.amountUSD ?? 0;

  const formValid = useMemo(() => {
    if (!cardHolder.trim()) return false;
    if (pan.replace(/\s/g, '').length < 13) return false;
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) return false;
    if (!/^\d{3}$/.test(cvv)) return false;
    return true;
  }, [cardHolder, pan, expiryDate, cvv]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!merchantOrderId) {
      setError('Payment session missing. Restart from "Buy Tokens".');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await submitBankPayment(id, { pan, cvv, expiryDate, cardHolder });
      if (result.status === 'FAILED' || result.status === 'MINT_FAILED') {
        const reason = result.failureReason || 'PAYMENT_FAILED';
        navigate(`/payment-failed?paymentId=${id}&reason=${encodeURIComponent(reason)}`);
        return;
      }
      navigate(`/payment-success?paymentId=${id}`);
    } catch (err) {
      navigate(`/payment-failed?paymentId=${id}&reason=${encodeURIComponent(err.message)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container py-20 flex items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-brand-500" /> Loading payment…
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="page-container py-20">
        <div className="alert-error">{error || 'Payment not found.'}</div>
      </div>
    );
  }

  if (payment.status !== 'PENDING') {
    return (
      <div className="page-container py-20">
        <div className="card-padded text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-honey-50 border border-honey-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-honey-600" />
          </div>
          <h2 className="text-2xl mb-2">This payment is no longer pending</h2>
          <p className="text-muted">Current status: <span className="font-semibold text-ink">{payment.status}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-12 space-y-8 animate-fade-in">
      <div>
        <span className="eyebrow mb-3 inline-flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Card Payment
        </span>
        <h1 className="text-4xl sm:text-5xl mt-4">Enter your card details</h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-7 card-padded space-y-5">
          <div>
            <label className="label" htmlFor="cardHolder">Cardholder name</label>
            <input
              id="cardHolder"
              type="text"
              className="input"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="John Doe"
              autoComplete="cc-name"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="pan">Card number (PAN)</label>
            <input
              id="pan"
              type="text"
              inputMode="numeric"
              className="input font-mono tracking-widest"
              value={pan}
              onChange={(e) => setPan(formatPan(e.target.value))}
              placeholder="4111 1111 1111 1111"
              autoComplete="cc-number"
              maxLength={23}
              required
            />
            <p className="text-xs text-faint mt-1.5">PAN is validated with Luhn check; CVV is cleared after authorization (PCI DSS).</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="expiry">Expiry (MM/YY)</label>
              <input
                id="expiry"
                type="text"
                inputMode="numeric"
                className="input font-mono"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                placeholder="12/29"
                autoComplete="cc-exp"
                maxLength={5}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="cvv">CVV</label>
              <input
                id="cvv"
                type="password"
                inputMode="numeric"
                className="input font-mono"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="•••"
                autoComplete="cc-csc"
                maxLength={3}
                required
              />
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <button
            type="submit"
            disabled={submitting || !formValid}
            className="btn-primary w-full text-base py-3.5"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Authorizing…</>
            ) : (
              <><Lock className="w-4 h-4" /> Pay ${Number(amount).toLocaleString()}</>
            )}
          </button>

          <p className="text-xs text-faint text-center">
            Test cards: 4111 1111 1111 1111 (valid), amounts over $20,000 simulate INSUFFICIENT_FUNDS.
          </p>
        </form>

        <aside className="lg:col-span-5 space-y-5">
          <div className="card-padded">
            <h3 className="section-title mb-4">Payment summary</h3>
            <div className="space-y-3.5 text-base">
              <Row label="Order" value={<span className="font-mono text-xs">{merchantOrderId}</span>} />
              <Row label="Amount" value={`$${Number(amount).toLocaleString()} USD`} />
              <Row label="Method" value="Card / Bank" />
            </div>
          </div>
          <div className="card-padded bg-surface-soft">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-brand-600" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-ink mb-1">PCI-DSS secured</h4>
                <p className="text-sm text-muted">
                  Card data is masked, CVV is cleared after authorization, and all attempts are
                  logged. We never store the full PAN.
                </p>
              </div>
            </div>
          </div>
        </aside>
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

export default BankPaymentPage;
