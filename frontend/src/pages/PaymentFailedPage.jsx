import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowRight, History } from 'lucide-react';
import { confirmPayment } from '../services/paymentService';

const REASON_MAP = {
  LUHN_FAILED: 'Card number failed Luhn check.',
  INVALID_CVV: 'Invalid CVV.',
  INVALID_DATE_FORMAT: 'Invalid expiry date format (MM/YY).',
  CARD_EXPIRED: 'Card is expired.',
  INSUFFICIENT_FUNDS: 'Insufficient funds on the card.',
  USER_CANCELLED: 'You cancelled the payment.',
  ALREADY_PROCESSED: 'This order has already been processed.',
};

function PaymentFailedPage() {
  const [params] = useSearchParams();
  const paymentId = params.get('paymentId');
  const reasonParam = params.get('reason') || '';
  const [serverReason, setServerReason] = useState('');

  useEffect(() => {
    if (!paymentId) return;
    confirmPayment(paymentId)
      .then((r) => setServerReason(r.failureReason || ''))
      .catch(() => {});
  }, [paymentId]);

  const reason = REASON_MAP[reasonParam] || REASON_MAP[serverReason] || serverReason || reasonParam || 'The transaction did not complete.';

  return (
    <div className="page-container py-20 max-w-2xl mx-auto">
      <div className="card-padded text-center space-y-4">
        <XCircle className="w-16 h-16 text-rose-400 mx-auto" />
        <h1 className="text-4xl">Payment failed</h1>
        <p className="text-slate-400">{reason}</p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link to="/buy-tokens" className="btn-primary">
            Try again <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/payments/history" className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition font-display font-semibold inline-flex items-center gap-1.5">
            <History className="w-4 h-4" /> Payment history
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailedPage;
