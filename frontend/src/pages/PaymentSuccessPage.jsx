import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ExternalLink, ArrowRight, AlertTriangle } from 'lucide-react';
import { confirmPayment } from '../services/paymentService';

const SEPOLIA_TX_BASE = 'https://sepolia.etherscan.io/tx/';

function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const paymentId = params.get('paymentId');
  const [status, setStatus] = useState('VERIFYING');
  const [txHash, setTxHash] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!paymentId) {
      setStatus('ERROR');
      setFailureReason('Missing payment id.');
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await confirmPayment(paymentId);
        if (cancelled) return;

        if (result.status === 'MINTED') {
          setStatus('MINTED');
          setTxHash(result.txHash || '');
        } else if (result.status === 'PAID') {
          setStatus('PAID');
          if (attemptRef.current < 12) {
            attemptRef.current += 1;
            setTimeout(poll, 4000);
          }
        } else if (result.status === 'MINT_FAILED' || result.status === 'FAILED' || result.status === 'EXPIRED') {
          setStatus(result.status);
          setFailureReason(result.failureReason || '');
        } else if (attemptRef.current < 12) {
          // PENDING — still propagating from PSP. Retry.
          attemptRef.current += 1;
          setTimeout(poll, 4000);
        } else {
          setStatus('TIMEOUT');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('ERROR');
        setFailureReason(err.message);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [paymentId]);

  if (status === 'VERIFYING' || status === 'PAID') {
    return (
      <div className="page-container py-20 max-w-2xl mx-auto">
        <div className="card-padded text-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
          <h2 className="text-3xl">{status === 'PAID' ? 'Payment confirmed — minting tokens…' : 'Verifying payment…'}</h2>
          <p className="text-slate-400">This may take a few seconds while the Treasury contract mints your BEET tokens on Sepolia.</p>
        </div>
      </div>
    );
  }

  if (status === 'MINTED') {
    return (
      <div className="page-container py-20 max-w-2xl mx-auto">
        <div className="card-padded space-y-6">
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h1 className="text-4xl">Tokens minted</h1>
            <p className="text-slate-400">Your BEET tokens are now in your wallet on Sepolia.</p>
          </div>
          {txHash && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-emerald-300/80 font-bold">Transaction</p>
              <p className="font-mono text-xs text-emerald-200 break-all">{txHash}</p>
              <a
                href={`${SEPOLIA_TX_BASE}${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-display font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                View on Etherscan
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/profile" className="btn-primary">
              View portfolio <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/payments/history" className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition font-display font-semibold">
              Payment history
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // MINT_FAILED, FAILED, EXPIRED, TIMEOUT, ERROR
  return (
    <div className="page-container py-20 max-w-2xl mx-auto">
      <div className="card-padded text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-3xl">
          {status === 'MINT_FAILED' && 'Payment received, but minting failed'}
          {status === 'FAILED' && 'Payment failed'}
          {status === 'EXPIRED' && 'Payment expired'}
          {status === 'TIMEOUT' && 'Still waiting…'}
          {status === 'ERROR' && 'Something went wrong'}
        </h2>
        {failureReason && <p className="text-slate-400">{failureReason}</p>}
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link to="/buy-tokens" className="btn-primary">Try again</Link>
          <Link to="/payments/history" className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition font-display font-semibold">
            Payment history
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
