import { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  RefreshCcw, TrendingUp, Coins, Users, Loader2,
  CheckCircle2, AlertTriangle, Clock, Hash, ExternalLink, ShieldCheck,
} from 'lucide-react';

const POLYGON_ADDRESS_BASE = 'https://polygonscan.com/address/';
import { getAnalytics } from '../../services/adminService';

const STATUS_COLORS = {
  Claimed: '#2e7d52',
  Matured: '#d9a441',
  Pending: '#3f6ca8',
};

const STATUS_META = {
  Claimed: { class: 'badge-success', Icon: CheckCircle2 },
  Matured: { class: 'badge-warning', Icon: AlertTriangle },
  Pending: { class: 'badge-info', Icon: Clock },
};

const CHART_TOOLTIP = {
  background: '#ffffff',
  border: '1px solid #ece6d9',
  borderRadius: '12px',
  boxShadow: '0 10px 30px -12px rgba(40,31,20,0.18)',
  color: '#211e18',
};

const shortAddr = (a) => (a ? `${a.substring(0, 6)}…${a.substring(a.length - 4)}` : '');
const formatTs = (ts) => (ts ? new Date(Number(ts) * 1000).toLocaleString() : '-');
const investmentStatus = (i) => (i.isClaimed ? 'Claimed' : i.isMatured ? 'Matured' : 'Pending');

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortDir, setSortDir] = useState('desc');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAnalytics(await getAnalytics());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = analytics?.summary;

  const sortedInvestments = useMemo(() => {
    if (!analytics?.investments) return [];
    const arr = [...analytics.investments];
    arr.sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];
      if (sortBy === 'username' || sortBy === 'ethAddress') {
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      if (sortBy === 'status') {
        av = investmentStatus(a);
        bv = investmentStatus(b);
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return arr;
  }, [analytics, sortBy, sortDir]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('desc'); }
  };
  const sortIndicator = (key) => (sortBy === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Claimed', value: summary.claimedCount },
      { name: 'Matured', value: summary.maturedUnclaimedCount },
      { name: 'Pending', value: summary.pendingCount },
    ].filter((d) => d.value > 0);
  }, [summary]);

  const barData = useMemo(() => {
    if (!analytics?.users) return [];
    return [...analytics.users]
      .filter((u) => u.investmentCount > 0)
      .sort((a, b) => b.totalInvested - a.totalInvested)
      .slice(0, 5)
      .map((u) => ({ name: u.username, USD: u.totalInvested }));
  }, [analytics]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <span className="eyebrow-honey mb-3 inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Admin Access</span>
          <h1 className="text-4xl sm:text-6xl mt-4">Dashboard</h1>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm mt-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading && !analytics && (
        <div className="card-padded text-center py-16">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
        </div>
      )}

      {summary && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard label="Total Invested" value={`$${summary.totalUSDInvested.toLocaleString()}`} icon={TrendingUp} accent="brand" />
            <KpiCard label="BEET Minted" value={summary.totalBEETMinted.toLocaleString()} icon={Coins} accent="honey" />
            <KpiCard label="Investments" value={summary.totalInvestments} icon={Hash} accent="info" />
            <KpiCard label="Active Investors" value={`${summary.uniqueInvestors} / ${summary.totalUsers}`} icon={Users} accent="brand" />
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatusCard label="Claimed" value={summary.claimedCount} accent="brand" icon={CheckCircle2} />
            <StatusCard label="Ready to Claim" value={summary.maturedUnclaimedCount} accent="honey" icon={AlertTriangle} />
            <StatusCard label="Pending" value={summary.pendingCount} accent="info" icon={Clock} />
          </section>

          {summary.totalInvestments > 0 && (
            <section className="grid lg:grid-cols-2 gap-5">
              <div className="card-padded">
                <h3 className="section-title mb-6">Investment Status</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} stroke="#ffffff" strokeWidth={3} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{ color: '#211e18' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-faint text-center py-12">No data.</p>
                )}
              </div>

              <div className="card-padded">
                <h3 className="section-title mb-6">Top 5 Investors (USD)</h3>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ece6d9" />
                      <XAxis dataKey="name" stroke="#9a9384" fontSize={12} />
                      <YAxis stroke="#9a9384" fontSize={12} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP}
                        labelStyle={{ color: '#211e18' }}
                        cursor={{ fill: 'rgba(46, 125, 82, 0.08)' }}
                      />
                      <Bar dataKey="USD" fill="#2e7d52" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-faint text-center py-12">No data.</p>
                )}
              </div>
            </section>
          )}

          <section>
            <p className="section-title mb-3">Records</p>
            <h2 className="text-3xl sm:text-4xl mb-6">All Investments</h2>
            {sortedInvestments.length === 0 ? (
              <div className="card-padded text-center py-12 text-muted">
                No investments recorded yet.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead className="bg-surface-soft text-[11px] uppercase tracking-[0.1em] text-faint">
                      <tr>
                        {[
                          ['id', 'ID'],
                          ['username', 'User'],
                          ['ethAddress', 'Address'],
                          ['amountUSD', 'Amount'],
                          ['startTime', 'Start'],
                          ['maturesOn', 'Matures'],
                          ['status', 'Status'],
                        ].map(([key, label]) => (
                          <th
                            key={key}
                            onClick={() => handleSort(key)}
                            className="text-left px-4 py-3.5 cursor-pointer hover:text-brand-700 select-none whitespace-nowrap font-bold border-b border-line transition-colors"
                          >
                            {label}{sortIndicator(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sortedInvestments.map((inv) => {
                        const status = investmentStatus(inv);
                        const meta = STATUS_META[status];
                        return (
                          <tr key={inv.id} className="hover:bg-cream-deep/60 transition-colors">
                            <td className="px-4 py-3.5 text-faint font-mono font-medium">#{inv.id}</td>
                            <td className="px-4 py-3.5 font-display font-semibold text-ink">{inv.username}</td>
                            <td className="px-4 py-3.5 font-mono text-xs text-muted" title={inv.ethAddress}>
                              <a
                                href={`${POLYGON_ADDRESS_BASE}${inv.ethAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 hover:text-brand-700 transition-colors"
                              >
                                {shortAddr(inv.ethAddress)}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                            <td className="px-4 py-3.5 font-display font-semibold text-brand-700 tracking-tight">
                              ${inv.amountUSD.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-muted whitespace-nowrap text-[13px]">{formatTs(inv.startTime)}</td>
                            <td className="px-4 py-3.5 text-muted whitespace-nowrap text-[13px]">{formatTs(inv.maturesOn)}</td>
                            <td className="px-4 py-3.5">
                              <span className={meta.class}>
                                <meta.Icon className="w-3 h-3" />
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, accent }) {
  const IconCmp = icon;
  const accentColor = {
    brand: 'text-brand-600 bg-brand-50 border-brand-200',
    honey: 'text-honey-600 bg-honey-50 border-honey-100',
    info: 'text-info bg-[#eaf0f8] border-[#cfdcef]',
  }[accent];

  return (
    <div className="card-padded card-hover">
      <div className="flex items-start justify-between mb-5">
        <p className="section-title">{label}</p>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${accentColor}`}>
          <IconCmp className="w-5 h-5" />
        </div>
      </div>
      <p className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-none">{value}</p>
    </div>
  );
}

function StatusCard({ label, value, accent, icon }) {
  const IconCmp = icon;
  const styles = {
    brand: { bar: 'bg-brand-500', text: 'text-brand-600' },
    honey: { bar: 'bg-honey-500', text: 'text-honey-600' },
    info: { bar: 'bg-info', text: 'text-info' },
  }[accent];
  return (
    <div className="card-padded relative overflow-hidden">
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles.bar}`} />
      <div className="flex items-center justify-between gap-2 pl-1">
        <div>
          <p className="section-title mb-2">{label}</p>
          <p className="font-display text-4xl font-semibold text-ink tracking-tight leading-none">{value}</p>
        </div>
        <IconCmp className={`w-8 h-8 ${styles.text}`} />
      </div>
    </div>
  );
}

export default AnalyticsPage;
