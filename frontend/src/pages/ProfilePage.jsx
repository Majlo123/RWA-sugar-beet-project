import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  Coins, Wallet, ShieldAlert, RefreshCcw, ShieldCheck,
  TrendingUp, Loader2, Calendar, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { getProfile } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import treasuryAbi from '../treasuryAbi.json';
import beetAbi from '../beetAbi.json';

const treasuryAddress = "0x0aE63859cCb63c6c031d1Ab93CE9Ba8a2AD41c83";
const beetAddress = "0x9d00209F07042cF2F337570ea4c87c860525a638";

const formatDate = (ts) => new Date(Number(ts) * 1000).toLocaleString();

function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [investments, setInvestments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [message, setMessage] = useState('');
  const { account, connectWallet } = useAuth();

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const profileData = await getProfile();
      setUserProfile(profileData);

      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const beetContract = new ethers.Contract(beetAddress, beetAbi, provider);
        const treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi, provider);

        const balance = await beetContract.balanceOf(profileData.ethAddress);
        setTokenBalance(ethers.formatUnits(balance, 18));

        const investmentIds = await treasuryContract.getInvestmentIdsForInvestor(profileData.ethAddress);
        const investmentDetails = await Promise.all(
          investmentIds.map((id) => treasuryContract.investments(id)),
        );

        setInvestments(
          investmentDetails.map((inv, index) => ({
            id: investmentIds[index],
            investor: inv[0],
            amountUSD: inv[1],
            startTime: inv[2],
            maturesOn: inv[3],
            isClaimed: inv[4],
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
    setMessage('');
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
      setMessage(`Yield claimed! Tx: ${tx.hash.substring(0, 10)}…${tx.hash.substring(tx.hash.length - 6)}`);
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
      <div className="page-container py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
        <div>
          <p className="section-title mb-3">Investor Portal</p>
          <h1 className="text-5xl sm:text-6xl mb-3">Dashboard</h1>
          <p className="text-xl text-slate-400 font-light">
            Welcome back, <span className="text-white font-semibold">{userProfile?.username}</span>
          </p>
        </div>
        <button onClick={fetchAllData} disabled={loading} className="btn-secondary">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!account && (
        <div className="alert mb-6 bg-blue-500/10 border-blue-500/30 text-blue-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 flex-shrink-0" />
            <span>Connect your MetaMask wallet to claim matured yields.</span>
          </div>
          <button onClick={connectWallet} className="btn-primary text-xs py-1.5 px-3">Connect</button>
        </div>
      )}

      {isAddressMismatch && (
        <div className="alert mb-6 bg-amber-500/10 border-amber-500/30 text-amber-200 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            Connected wallet ({account.substring(0, 6)}…{account.substring(account.length - 4)}) does
            not match your registered address. Switch in MetaMask to claim yields.
          </span>
        </div>
      )}

      {message && <div className="alert-success mb-6">{message}</div>}
      {error && userProfile && <div className="alert-error mb-6">{error}</div>}

      {/* Hero balance card */}
      <section className="mb-10">
        <div className="card relative overflow-hidden p-10 border-emerald-500/30 glow-emerald">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-500/5" />
          <div className="absolute inset-0 -z-10 grid-pattern opacity-30 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_60%)]" />
          <div className="absolute -right-10 -top-10 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <p className="font-eyebrow text-sm uppercase tracking-[0.18em] text-emerald-300 mb-4 flex items-center gap-2 font-bold">
                <Coins className="w-5 h-5" /> BEET Balance
              </p>
              <p className="font-display text-7xl sm:text-8xl font-extrabold gradient-text mb-3 tracking-tight leading-none">
                {Number(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </p>
              <p className="text-xl text-slate-400 font-light">
                ≈ <span className="font-display font-semibold text-slate-300">${(Number(tokenBalance) * 1000).toLocaleString()}</span> USD value
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 lg:min-w-[420px]">
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
          <div className="space-y-3 text-base">
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
          </div>
        </div>

        <div className="card-padded">
          <h3 className="section-title mb-5">Wallet</h3>
          <div className="space-y-3 text-base">
            <Row
              label="Registered"
              value={
                <span className="font-mono text-xs">
                  {userProfile?.ethAddress?.substring(0, 8)}…{userProfile?.ethAddress?.substring(userProfile.ethAddress.length - 6)}
                </span>
              }
            />
            <Row
              label="Connected"
              value={
                account ? (
                  <span className="font-mono text-xs text-emerald-300">
                    {account.substring(0, 8)}…{account.substring(account.length - 6)}
                  </span>
                ) : (
                  <span className="text-slate-500">Not connected</span>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
        <h2 className="text-4xl sm:text-5xl mb-7">My Investments</h2>

        {investments.length === 0 ? (
          <div className="card-padded text-center py-12">
            <Coins className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No investments yet.</p>
            <p className="text-sm text-slate-500 mt-1">Contact an admin to record your first investment.</p>
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
                  className="card-padded flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <Coins className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <p className="font-display text-2xl font-extrabold tracking-tight">${inv.amountUSD.toString()} USD</p>
                        <span className={status.class}>
                          <status.Icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Started {formatDate(inv.startTime)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Matures {formatDate(inv.maturesOn)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {isMatured && !inv.isClaimed && (
                    <button
                      onClick={() => handleClaim(inv.id)}
                      disabled={claimingId === inv.id.toString() || !account}
                      className="btn-primary text-sm"
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
    <div className={`rounded-xl px-4 py-3.5 border ${accent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
      <div className="font-eyebrow flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400 mb-2">
        <IconCmp className={`w-3.5 h-3.5 ${accent ? 'text-amber-400' : 'text-slate-500'}`} />
        {label}
      </div>
      <p className={`font-display text-2xl font-extrabold tracking-tight ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 truncate">{value}</span>
    </div>
  );
}

export default ProfilePage;
