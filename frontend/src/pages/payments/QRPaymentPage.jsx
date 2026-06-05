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
          <QrCode className="w-4 h-4" /> QR Payment
        </span>
        <h1 className="text-5xl">Scan to pay</h1>
        <p className="text-lg text-slate-400 mt-4 font-light">
          Scan this NBS IPS QR code with the mobile banking app to complete the transaction.
        </p>
      </div>

      <div className="card-padded space-y-5">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-white">
            {qrImage ? (
              <img src={`data:image/png;base64,${qrImage}`} alt="NBS IPS payment QR code" className="w-60 h-60" />
            ) : qrError ? (
              <div className="w-60 h-60 flex items-center justify-center text-center text-red-600 text-sm p-4">
                {qrError}
              </div>
            ) : (
              <div className="w-60 h-60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-emerald-300">
          <Smartphone className="w-4 h-4" />
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Waiting for mobile confirmation…
        </div>

        <div className="space-y-2 text-base">
          <Row label="Order" value={<span className="font-mono text-xs">{payment.merchantOrderId}</span>} />
          <Row label="Amount" value={`$${Number(payment.amountUSD).toLocaleString()} USD`} />
        </div>

        {ipsString && (
          <p className="text-[11px] text-slate-500 font-mono break-all bg-slate-900/60 rounded-lg p-3 border border-slate-800">
            {ipsString}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={handleCancel} type="button" className="px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition flex-1">
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
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-medium">{value}</span>
    </div>
  );
}

export default QRPaymentPage;
