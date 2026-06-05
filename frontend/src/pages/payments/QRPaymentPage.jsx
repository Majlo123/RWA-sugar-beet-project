import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { QrCode, Loader2, AlertTriangle, Smartphone } from 'lucide-react';
import { getPaymentById, getPaymentQRCode, confirmPayment, simulatePayment } from '../../services/paymentService';

const TERMINAL_FAILURE = ['FAILED', 'EXPIRED', 'MINT_FAILED'];

function QRPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [payment, setPayment] = useState(location.state?.payment ?? null);
  const [loading, setLoading] = useState(!payment);
  const [qrImage, setQrImage] = useState('');
  const [ipsString, setIpsString] = useState('');
  const [qrError, setQrError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Load the payment if we didn't arrive with it in router state.
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

  // Fetch the real PSP-generated NBS IPS QR for a pending QR payment.
  useEffect(() => {
    if (!payment || payment.status !== 'PENDING') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getPaymentQRCode(id);
        if (cancelled) return;
        setQrImage(data.qrCode);
        setIpsString(data.ipsString);
      } catch (err) {
        if (!cancelled) setQrError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id, payment]);

  // Poll the backend: when the mobile app confirms on the PSP, ConfirmPayment
  // mints on-chain and flips the status. Auto-advance on a terminal status.
  useEffect(() => {
    if (!payment || payment.status !== 'PENDING') return;
    let busy = false;
    pollRef.current = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await confirmPayment(id);
        if (res.status === 'MINTED') {
          clearInterval(pollRef.current);
          navigate(`/payment-success?paymentId=${id}`);
        } else if (TERMINAL_FAILURE.includes(res.status)) {
          clearInterval(pollRef.current);
          navigate(`/payment-failed?paymentId=${id}&reason=${encodeURIComponent(res.failureReason || res.status)}`);
        }
      } catch {
        // transient (e.g. PSP momentarily unreachable) — keep polling
      } finally {
        busy = false;
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [id, payment, navigate]);

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
    if (pollRef.current) clearInterval(pollRef.current);
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
          <QrCode className="w-3.5 h-3.5" /> QR Payment
        </span>
        <h1 className="text-4xl sm:text-5xl mt-4">Scan to pay</h1>
        <p className="text-lg text-muted mt-4">
          Scan this NBS IPS QR code with the mobile banking app to complete the transaction.
        </p>
      </div>

      <div className="card-padded space-y-5">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-white border border-line shadow-soft">
            {qrImage ? (
              <img src={`data:image/png;base64,${qrImage}`} alt="NBS IPS payment QR code" className="w-60 h-60" />
            ) : qrError ? (
              <div className="w-60 h-60 flex items-center justify-center text-center text-error text-sm p-4">
                {qrError}
              </div>
            ) : (
              <div className="w-60 h-60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-faint" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-brand-700 font-medium">
          <Smartphone className="w-4 h-4" />
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Waiting for mobile confirmation…
        </div>

        <div className="space-y-3 text-base border-t border-line pt-5">
          <Row label="Order" value={<span className="font-mono text-xs">{payment.merchantOrderId}</span>} />
          <Row label="Amount" value={`$${Number(payment.amountUSD).toLocaleString()} USD`} />
        </div>

        {ipsString && (
          <p className="text-[11px] text-muted font-mono break-all bg-cream-deep rounded-lg p-3 border border-line">
            {ipsString}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={handleCancel} type="button" className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting} type="button" className="btn-primary flex-1 text-base py-3">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <>Simulate payment (no phone)</>}
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

export default QRPaymentPage;
