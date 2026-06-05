import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Loader2, ExternalLink, ArrowRight, Receipt } from 'lucide-react';
import { getPaymentHistory } from '../services/paymentService';

const POLYGON_TX_BASE = 'https://polygonscan.com/tx/';

const STATUS_BADGE = {
  PENDING:     'badge-neutral',
  PAID:        'badge-info',
  MINTED:      'badge-success',
  FAILED:      'badge-error',
  MINT_FAILED: 'badge-warning',
  EXPIRED:     'badge-neutral',
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPaymentHistory()
      .then((list) => setPayments(list))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container py-12 space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow mb-3 inline-flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Payment History
          </span>
          <h1 className="text-4xl sm:text-5xl mt-4">Your payments</h1>
        </div>
        <Link to="/buy-tokens" className="btn-primary">
          Buy more tokens <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="card-padded flex items-center justify-center text-muted py-16">
          <Loader2 className="w-6 h-6 animate-spin mr-3 text-brand-500" /> Loading…
        </div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : payments.length === 0 ? (
        <div className="card-padded text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-cream-deep border border-line flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-7 h-7 text-faint" />
          </div>
          <p className="text-ink font-semibold text-lg">No payments yet</p>
          <p className="text-sm text-muted mt-1.5 mb-6">You haven't made any token purchases yet.</p>
          <Link to="/buy-tokens" className="btn-primary inline-flex">Buy your first BEET</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Method</th>
                  <th className="!text-right">Amount</th>
                  <th>Status</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="font-mono text-xs text-muted">{p.merchantOrderId.slice(0, 24)}…</td>
                    <td>{p.paymentMethod}</td>
                    <td className="!text-right font-semibold text-ink">${Number(p.amountUSD).toLocaleString()}</td>
                    <td>
                      <span className={STATUS_BADGE[p.status] || STATUS_BADGE.PENDING}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.txHash ? (
                        <a
                          href={`${POLYGON_TX_BASE}${p.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                        >
                          {p.txHash.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentHistoryPage;
