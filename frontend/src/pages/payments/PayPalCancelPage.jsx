import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cancelPayPal } from '../../services/paymentService';

// PayPal redirects here when the user cancels the payment on sandbox.
function PayPalCancelPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const merchantOrderId = params.get('merchantOrderId');
    (async () => {
      if (merchantOrderId) {
        try { await cancelPayPal(merchantOrderId); } catch { /* ignore */ }
      }
      navigate(`/payment-failed?reason=USER_CANCELLED`);
    })();
  }, [params, navigate]);

  return (
    <div className="page-container py-20 flex flex-col items-center justify-center text-slate-300">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-4" />
      <p className="text-lg font-display">Cancelling payment…</p>
    </div>
  );
}

export default PayPalCancelPage;
