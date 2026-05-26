import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { capturePayPal } from '../../services/paymentService';

// PayPal sandbox redirects here after the user approves the payment.
// URL looks like:
//   /paypal-return?token=PAYPAL_ORDER_ID&PayerID=PAYER_ID&merchantOrderId=beet-...
// We capture the payment via the BEET backend (which calls paypal-service),
// then navigate to /payment-success which polls for MINTED.
function PayPalReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const paypalOrderId = params.get('token');
    const payerId = params.get('PayerID');
    const merchantOrderId = params.get('merchantOrderId');

    if (!paypalOrderId || !merchantOrderId) {
      setError('Missing PayPal return parameters. Try again from "Buy Tokens".');
      return;
    }

    (async () => {
      try {
        const result = await capturePayPal({ merchantOrderId, paypalOrderId, payerId });
        navigate(`/payment-success?paymentId=${result.paymentId}`);
      } catch (err) {
        navigate(`/payment-failed?reason=${encodeURIComponent(err.message)}`);
      }
    })();
  }, [params, navigate]);

  if (error) {
    return (
      <div className="page-container py-20 max-w-xl mx-auto">
        <div className="card-padded text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-2xl mb-2">Could not finish PayPal payment</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-20 flex flex-col items-center justify-center text-slate-300">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-4" />
      <p className="text-lg font-display">Finalizing PayPal payment…</p>
      <p className="text-sm text-slate-500 mt-1">Capturing funds and minting tokens</p>
    </div>
  );
}

export default PayPalReturnPage;
