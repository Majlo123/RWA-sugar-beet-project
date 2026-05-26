import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import { getPaymentHistory } from '../services/paymentService';

const SEPOLIA_TX_BASE = 'https://sepolia.etherscan.io/tx/';

const STATUS_STYLES = {
  PENDING:     'bg-slate-500/10 text-slate-300 border-slate-500/30',
  PAID:        'bg-blue-500/10 text-blue-300 border-blue-500/30',
  MINTED:      'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  FAILED:      'bg-rose-500/10 text-rose-300 border-rose-500/30',
  MINT_FAILED: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  EXPIRED:     'bg-slate-500/10 text-slate-400 border-slate-500/30',
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
    <div className="page-container py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow-emerald mb-3 inline-flex items-center gap-1.5">
            <History className="w-4 h-4" /> Payment History
          </span>
          <h1 className="text-5xl">Your payments</h1>
        </div>
        <Link to="/buy-tokens" className="btn-primary">
          Buy more tokens <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="card-padded flex items-center justify-center text-slate-300">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading…
        </div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : payments.length === 0 ? (
        <div className="card-padded text-center text-slate-400">
          <p className="mb-4">You haven't made any token purchases yet.</p>
          <Link to="/buy-tokens" className="btn-primary inline-flex">Buy your first BEET</Link>
        </div>
      ) : (
        <div className="card-padded p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 border-b border-slate-800">
              <tr className="text-left">
                <Th>Date</Th>
                <Th>Order</Th>
                <Th>Method</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Tx</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                  <Td>{formatDate(p.createdAt)}</Td>
                  <Td className="font-mono text-xs">{p.merchantOrderId.slice(0, 24)}…</Td>
                  <Td>{p.paymentMethod}</Td>
                  <Td className="text-right font-semibold">${Number(p.amountUSD).toLocaleString()}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_STYLES[p.status] || STATUS_STYLES.PENDING}`}>
                      {p.status}
                    </span>
                  </Td>
                  <Td>
                    {p.txHash ? (
                      <a
                        href={`${SEPOLIA_TX_BASE}${p.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200"
                      >
                        {p.txHash.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-4 py-3 font-display font-semibold text-slate-300 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-slate-200 ${className}`}>{children}</td>;
}

export default PaymentHistoryPage;
