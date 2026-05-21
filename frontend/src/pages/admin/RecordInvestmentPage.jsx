import { useMemo, useState } from 'react';
import { Plus, Loader2, Wallet, Coins, Info, ExternalLink, CheckCircle2 } from 'lucide-react';
import { recordInvestment } from '../../services/treasuryService';

const SEPOLIA_TX_BASE = 'https://sepolia.etherscan.io/tx/';

function RecordInvestmentPage() {
  const [investorAddress, setInvestorAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const amountUSD = useMemo(() => {
    const n = Number(tokenAmount);
    return isNaN(n) || n <= 0 ? 0 : n * 1000;
  }, [tokenAmount]);

  const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(investorAddress);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTxHash('');
    if (amountUSD === 0) {
      setError('Please enter a valid number of tokens.');
      return;
    }
    setLoading(true);
    try {
      const data = await recordInvestment({ investorAddress, amountUSD });
      setTxHash(data.txHash);
      setInvestorAddress('');
      setTokenAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
    <div>
      <span className="eyebrow-amber mb-3 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> Admin Access</span>
      <h1 className="text-5xl sm:text-6xl">Record Investment</h1>
    </div>
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7">
        <div className="card-padded">
          <div className="flex items-center gap-2.5 mb-3">
            <Plus className="w-7 h-7 text-emerald-400" />
            <h2 className="text-3xl sm:text-4xl">Record New Investment</h2>
          </div>
          <p className="text-lg text-slate-400 mb-8 font-light text-pretty">
            Mint BEET tokens to an investor's wallet. This calls the Treasury smart contract on Sepolia.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label flex items-center gap-1.5" htmlFor="addr">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Investor's Ethereum Address
              </label>
              <input
                id="addr"
                type="text"
                className={`input font-mono text-sm ${investorAddress && !isValidAddr ? 'border-rose-500/60' : ''}`}
                value={investorAddress}
                onChange={(e) => setInvestorAddress(e.target.value)}
                placeholder="0x…"
                required
              />
              {investorAddress && !isValidAddr && (
                <p className="text-xs text-rose-300 mt-1">Invalid Ethereum address format.</p>
              )}
            </div>

            <div>
              <label className="label flex items-center gap-1.5" htmlFor="amount">
                <Coins className="w-4 h-4 text-amber-400" />
                Number of BEET Tokens
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                step="1"
                className="input"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="e.g. 5"
                required
              />
            </div>

            {amountUSD > 0 && (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/30 p-6">
                <p className="font-eyebrow text-xs uppercase tracking-[0.15em] text-emerald-300/80 mb-2 font-bold">Calculated Amount</p>
                <p className="font-display text-4xl sm:text-5xl font-extrabold gradient-text tracking-tight leading-none">${amountUSD.toLocaleString()} USD</p>
                <p className="text-base text-slate-400 mt-2 font-medium">{tokenAmount} BEET × $1,000</p>
              </div>
            )}

            {error && <div className="alert-error">{error}</div>}
            {txHash && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-emerald-200 text-base">Investment recorded on-chain</p>
                    <p className="text-sm text-emerald-200/70 mt-0.5 font-medium">
                      BEET tokens minted to the investor's wallet.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  <span className="font-mono text-xs text-emerald-200/60">
                    {txHash.substring(0, 14)}…{txHash.substring(txHash.length - 8)}
                  </span>
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
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isValidAddr || amountUSD === 0}
              className="btn-primary w-full text-base py-3"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Transaction…</>
              ) : (
                <><Plus className="w-4 h-4" /> Record Investment</>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-5">
        <div className="card-padded">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl mb-2.5">How it works</h3>
              <p className="text-base text-slate-400 leading-relaxed text-pretty">
                The smart contract automatically mints BEET tokens 1:1 with the USD amount you specify
                (1,000 USD = 1 BEET) directly to the investor's wallet. The investment is locked for one
                cycle before yield can be claimed.
              </p>
            </div>
          </div>
        </div>

        <div className="card-padded">
          <h3 className="section-title mb-5">Token Economics</h3>
          <div className="space-y-3 text-base">
            <Row label="Token price" value="$1,000 / BEET" />
            <Row label="Yield rate" value="10% per cycle" />
            <Row label="Cycle length" value="1 year" />
            <Row label="Network" value="Sepolia" />
          </div>
        </div>

        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-6 text-base text-amber-200/80">
          <strong className="font-display block text-amber-300 mb-2 text-lg font-bold">⚡ Gas required</strong>
          <span className="text-pretty">The admin wallet must hold Sepolia ETH to pay for the transaction. The transaction may take
          a few seconds to confirm on-chain.</span>
        </div>
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

export default RecordInvestmentPage;
