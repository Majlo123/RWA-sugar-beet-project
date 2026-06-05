import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  Coins, Wallet, ShieldAlert, RefreshCcw, ShieldCheck,
  TrendingUp, Loader2, Calendar, CheckCircle2, Clock, AlertTriangle,
  UserCheck, XCircle, ExternalLink,
} from 'lucide-react';

const POLYGON_TX_BASE = 'https://polygonscan.com/tx/';
import { getProfile } from '../services/userService';
import { getPaymentHistory } from '../services/paymentService';
import { useAuth, ensurePolygonNetwork } from '../context/AuthContext';
import treasuryAbi from '../treasuryAbi.json';
import beetAbi from '../beetAbi.json';

const KYC_BADGE = {
  verified: { label: 'Verified', class: 'badge-success', Icon: CheckCircle2 },
  pending:  { label: 'Pending review', class: 'badge-info', Icon: Clock },
  rejected: { label: 'Rejected', class: 'badge-error', Icon: XCircle },
  none:     { label: 'Not submitted', class: 'badge-warning', Icon: AlertTriangle },
};

const treasuryAddress = "0x74b5B77E912db132A814E63955Cd4538f4Fa697D";
const beetAddress = "0x20C9F172583F02202c6E17E08f64cefa8A4dc20c";

const formatDate = (ts) => new Date(Number(ts) * 1000).toLocaleString();

function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [investments, setInvestments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const { account, connectWallet } = useAuth();

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const profileData = await getProfile();
      setUserProfile(profileData);

      if (window.ethereum) {
        await ensurePolygonNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const beetContract = new ethers.Contract(beetAddress, beetAbi, provider);
        const treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi, provider);

        const balance = await beetContract.balanceOf(profileData.ethAddress);
        setTokenBalance(ethers.formatUnits(balance, 18));

        const investmentIds = await treasuryContract.getInvestmentIdsForInvestor(profileData.ethAddress);
        const investmentDetails = await Promise.all(
          investmentIds.map((id) => treasuryContract.investments(id)),
        );

        // Fetch mint tx hashes from payment history (MINTED payments, oldest first)
        let mintedTxHashes = [];
        try {
          const history = await getPaymentHistory();
          mintedTxHashes = history
            .filter((p) => p.status === 'MINTED' && p.txHash)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((p) => p.txHash);
        } catch { /* ignore */ }

        // Fetch YieldClaimed events to get claim tx hashes keyed by investmentId
        const claimFilter = treasuryContract.filters.YieldClaimed();
        const claimEvents = await treasuryContract.queryFilter(claimFilter);
        const claimTxByInvestmentId = {};
        for (const ev of claimEvents) {
          claimTxByInvestmentId[ev.args.investmentId.toString()] = ev.transactionHash;
        }

        // Sort investments by startTime ascending so they align with mintedTxHashes order
        const mapped = investmentDetails.map((inv, index) => ({
          id: investmentIds[index],
          investor: inv[0],
          amountUSD: inv[1],
          startTime: inv[2],
          maturesOn: inv[3],
          isClaimed: inv[4],
        }));
        mapped.sort((a, b) => Number(a.startTime) - Number(b.startTime));

        setInvestments(
          mapped.map((inv, index) => ({
            ...inv,
            mintTxHash: mintedTxHashes[index] ?? null,
            claimTxHash: claimTxByInvestmentId[inv.id.toString()] ?? null,
          })),
        );
      } else {
        throw new Error("MetaMask is not installed.");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleClaim = async (investmentId) => {
    setError('');
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    setClaimingId(investmentId.toString());
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const treasury = new ethers.Contract(treasuryAddress, treasuryAbi, signer);
      const tx = await treasury.claimYield(investmentId);
      await tx.wait();
      fetchAllData();
    } catch (err) {
      console.error(err);
      setError(err.reason || "Failed to claim yield.");
    } finally {
      setClaimingId(null);
    }
  };

  const isAddressMismatch =
    account && userProfile && userProfile.ethAddress.toLowerCase() !== account.toLowerCase();

  const totalInvestedUSD = investments.reduce((s, i) => s + Number(i.amountUSD || 0), 0);
  const claimedCount = investments.filter((i) => i.isClaimed).length;
  const now = Math.floor(Date.now() / 1000);
  const maturedUnclaimed = investments.filter(
    (i) => !i.isClaimed && now >= Number(i.maturesOn),
  ).length;

  if (!userProfile && loading) {
    return (
      <div className="page-container py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div className="page-container py-12">
        <div className="alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <p className="section-title mb-3">Investor Portal</p>
          <h1 className="text-4xl sm:text-6xl mb-3">Dashboard</h1>
          <p className="text-lg text-muted">
            Welcome back, <span className="text-ink font-semibold">{userProfile?.username}</span>
          </p>
        </div>
        <button onClick={fetchAllData} disabled={loading} className="btn-secondary">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!account && (
        <div className="alert-info mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 flex-shrink-0" />
            <span>Connect your MetaMask wallet to claim matured yields.</span>
          </div>
          <button onClick={connectWallet} className="btn-primary text-sm py-2 px-4 flex-shrink-0">Connect</button>
        </div>
      )}

      {isAddressMismatch && (
        <div className="alert-warning mb-6 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            Connected wallet ({account.substring(0, 6)}…{account.substring(account.length - 4)}) does
            not match your registered address. Switch in MetaMask to claim yields.
          </span>
        </div>
      )}

      {userProfile && userProfile.role !== 'admin' && userProfile.kycStatus !== 'verified' && (
        <KYCBanner status={userProfile.kycStatus} reason={userProfile.kycRejectionReason} />
      )}

      {error && userProfile && <div className="alert-error mb-6">{error}</div>}

      {/* Hero balance card — signature deep-green feature panel */}
      <section className="mb-10">
        <div
          className="card relative overflow-hidden p-8 sm:p-10 text-white border-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-600) 60%, var(--color-brand-500))' }}
        >
          <div className="absolute inset-0 grid-pattern opacity-[0.15] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" />
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-16 w-72 h-72 bg-beet-500/25 rounded-full blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/75 mb-4 flex items-center gap-2 font-bold">
                <Coins className="w-5 h-5" /> BEET Balance
              </p>
              <p className="font-display text-6xl sm:text-7xl font-semibold mb-3 tracking-tight leading-none">
                {Number(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </p>
              <p className="text-lg text-white/80">
                ≈ <span className="font-display font-semibold text-white">${(Number(tokenBalance) * 1000).toLocaleString()}</span> USD value
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
              <MiniStat label="Total Invested" value={`$${totalInvestedUSD.toLocaleString()}`} icon={TrendingUp} />
              <MiniStat label="Claimed" value={claimedCount} icon={CheckCircle2} />
              <MiniStat label="Ready" value={maturedUnclaimed} icon={Clock} accent={maturedUnclaimed > 0} />
            </div>
          </div>
        </div>
      </section>

      {/* Account info */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="card-padded">
          <h3 className="section-title mb-5">Account</h3>
          <div className="space-y-3.5 text-base">
            <Row label="Username" value={userProfile?.username} />
            <Row
              label="Role"
              value={
                <span className={userProfile?.role === 'admin' ? 'badge-warning' : 'badge-neutral'}>
                  {userProfile?.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                  {userProfile?.role}
                </span>
              }
            />
            <Row
              label="Member since"
              value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : '-'}
            />
            {userProfile?.role !== 'admin' && (
              <Row
                label="KYC"
                value={
                  (() => {
                    const meta = KYC_BADGE[userProfile?.kycStatus || 'none'] || KYC_BADGE.none;
                    return (
                      <span className={meta.class}>
                        <meta.Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    );
                  })()
                }
              />
            )}
          </div>
        </div>

        <div className="card-padded">
          <h3 className="section-title mb-5">Wallet</h3>
          <div className="space-y-3.5 text-base">
            <Row
              label="Registered"
              value={
                <span className="font-mono text-xs text-ink-soft">
                  {userProfile?.ethAddress?.substring(0, 8)}…{userProfile?.ethAddress?.substring(userProfile.ethAddress.length - 6)}
                </span>
              }
            />
            <Row
              label="Connected"
              value={
                account ? (
                  <span className="font-mono text-xs text-brand-700">
                    {account.substring(0, 8)}…{account.substring(account.length - 6)}
                  </span>
                ) : (
                  <span className="text-faint">Not connected</span>
                )
              }
            />
            <Row
              label="Status"
              value={
                isAddressMismatch ? (
                  <span className="badge-warning">Mismatch</span>
                ) : account ? (
                  <span className="badge-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Verified
                  </span>
                ) : (
                  <span className="badge-neutral">Disconnected</span>
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Investments */}
      <section>
        <p className="section-title mb-3">Portfolio</p>
        <h2 className="text-3xl sm:text-4xl mb-7">My Investments</h2>

        {investments.length === 0 ? (
          <div className="card-padded text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-cream-deep border border-line flex items-center justify-center mx-auto mb-4">
              <Coins className="w-7 h-7 text-faint" />
            </div>
            <p className="text-ink font-semibold text-lg">No investments yet</p>
            <p className="text-sm text-muted mt-1.5">Complete KYC and buy BEET tokens to start your portfolio.</p>
            <Link to="/buy-tokens" className="btn-primary text-sm mt-6">
              <Coins className="w-4 h-4" /> Buy Tokens
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {investments.map((inv) => {
              const matures = Number(inv.maturesOn);
              const isMatured = now >= matures;
              const status = inv.isClaimed
                ? { label: 'Claimed', class: 'badge-success', Icon: CheckCircle2 }
                : isMatured
                ? { label: 'Ready to Claim', class: 'badge-warning', Icon: AlertTriangle }
                : { label: 'Active', class: 'badge-info', Icon: Clock };

              return (
                <div
                  key={`${inv.id.toString()}-${inv.startTime.toString()}`}
                  className="card-padded card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                      <Coins className="w-7 h-7 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <p className="font-display text-2xl font-semibold tracking-tight text-ink">${inv.amountUSD.toString()} USD</p>
                        <span className={status.class}>
                          <status.Icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Started {formatDate(inv.startTime)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Matures {formatDate(inv.maturesOn)}
                        </span>
                        {(inv.claimTxHash || inv.mintTxHash) && (
                          <a
                            href={`${POLYGON_TX_BASE}${inv.claimTxHash ?? inv.mintTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 transition-colors font-semibold"
                          >
                            {inv.claimTxHash ? 'View Claim on Polygonscan' : 'View on Polygonscan'}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </p>
                    </div>
                  </div>

                  {isMatured && !inv.isClaimed && (
                    <button
                      onClick={() => handleClaim(inv.id)}
                      disabled={claimingId === inv.id.toString() || !account}
                      className="btn-primary text-sm flex-shrink-0"
                    >
                      {claimingId === inv.id.toString() ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</>
                      ) : (
                        <><TrendingUp className="w-4 h-4" /> Claim Yield</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value, icon, accent }) {
  const IconCmp = icon;
  return (
    <div className={`rounded-xl px-4 py-3.5 border backdrop-blur-sm ${accent ? 'bg-honey-500/25 border-honey-300/40' : 'bg-white/10 border-white/15'}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-bold mb-2 text-white/70">
        <IconCmp className={`w-3.5 h-3.5 ${accent ? 'text-honey-100' : 'text-white/60'}`} />
        {label}
      </div>
      <p className={`font-display text-2xl font-semibold tracking-tight ${accent ? 'text-honey-100' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium truncate">{value}</span>
    </div>
  );
}

function KYCBanner({ status, reason }) {
  const config = {
    none: {
      title: 'KYC verification required',
      subtitle: 'Verify your identity so investments can be recorded to your wallet.',
      cta: 'Start verification',
      cls: 'alert-warning',
      iconCls: 'text-honey-600',
      Icon: ShieldAlert,
    },
    pending: {
      title: 'KYC submission under review',
      subtitle: 'An administrator is reviewing your details. You will be notified once a decision is made.',
      cta: 'View details',
      cls: 'alert-info',
      iconCls: 'text-info',
      Icon: Clock,
    },
    rejected: {
      title: 'KYC submission rejected',
      subtitle: reason || 'Submit a new request with corrected details.',
      cta: 'Resubmit',
      cls: 'alert-error',
      iconCls: 'text-error',
      Icon: XCircle,
    },
  };
  const c = config[status] || config.none;

  return (
    <div className={`${c.cls} mb-6 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row`}>
      <div className="flex items-start gap-3">
        <c.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.iconCls}`} />
        <div>
          <p className="font-display font-semibold text-base mb-0.5">{c.title}</p>
          <p className="text-sm text-pretty opacity-90">{c.subtitle}</p>
        </div>
      </div>
      <Link to="/kyc" className="btn-primary text-sm flex-shrink-0">
        <UserCheck className="w-4 h-4" />
        {c.cta}
      </Link>
    </div>
  );
}

export default ProfilePage;
