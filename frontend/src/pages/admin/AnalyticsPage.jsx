import { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  RefreshCcw, TrendingUp, Coins, Users, Loader2,
  CheckCircle2, AlertTriangle, Clock, Hash,
} from 'lucide-react';
import { getAnalytics } from '../../services/adminService';

const STATUS_COLORS = {
  Claimed: '#10b981',
  Matured: '#f59e0b',
  Pending: '#3b82f6',
};

const STATUS_META = {
  Claimed: { class: 'badge-success', Icon: CheckCircle2 },
  Matured: { class: 'badge-warning', Icon: AlertTriangle },
  Pending: { class: 'badge-info', Icon: Clock },
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
      <div className="flex items-center justify-end -mt-4">
        <button onClick={load} disabled={loading} className="btn-secondary text-sm">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading && !analytics && (
        <div className="card-padded text-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        </div>
      )}

      {summary && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard label="Total Invested" value={`$${summary.totalUSDInvested.toLocaleString()}`} icon={TrendingUp} accent="emerald" />
            <KpiCard label="BEET Minted" value={summary.totalBEETMinted.toLocaleString()} icon={Coins} accent="amber" />
            <KpiCard label="Investments" value={summary.totalInvestments} icon={Hash} accent="blue" />
            <KpiCard label="Active Investors" value={`${summary.uniqueInvestors} / ${summary.totalUsers}`} icon={Users} accent="emerald" />
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatusCard label="Claimed" value={summary.claimedCount} accent="emerald" icon={CheckCircle2} />
            <StatusCard label="Ready to Claim" value={summary.maturedUnclaimedCount} accent="amber" icon={AlertTriangle} />
            <StatusCard label="Pending" value={summary.pendingCount} accent="blue" icon={Clock} />
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
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} stroke="#0a0f1c" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1f2937', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No data.</p>
                )}
              </div>

              <div className="card-padded">
                <h3 className="section-title mb-6">Top 5 Investors (USD)</h3>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2a3d" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: '#1f2937', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                      />
                      <Bar dataKey="USD" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No data.</p>
                )}
              </div>
            </section>
          )}

          <section>
            <p className="section-title mb-3">Records</p>
            <h2 className="text-3xl sm:text-4xl mb-6">All Investments</h2>
            {sortedInvestments.length === 0 ? (
              <div className="card-padded text-center py-12 text-slate-400">
                No investments recorded yet.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/60 text-[11px] uppercase tracking-[0.12em] text-slate-400 font-eyebrow">
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
                            className="text-left px-4 py-4 cursor-pointer hover:bg-slate-800/60 select-none whitespace-nowrap font-bold"
                          >
                            {label}{sortIndicator(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sortedInvestments.map((inv) => {
                        const status = investmentStatus(inv);
                        const meta = STATUS_META[status];
                        return (
                          <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-4 text-slate-400 font-mono font-medium">#{inv.id}</td>
                            <td className="px-4 py-4 font-display font-semibold text-white">{inv.username}</td>
                            <td className="px-4 py-4 font-mono text-xs text-slate-400" title={inv.ethAddress}>
                              {shortAddr(inv.ethAddress)}
                            </td>
                            <td className="px-4 py-4 font-display font-bold text-emerald-300 tracking-tight">
                              ${inv.amountUSD.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-slate-400 whitespace-nowrap text-[13px]">{formatTs(inv.startTime)}</td>
                            <td className="px-4 py-4 text-slate-400 whitespace-nowrap text-[13px]">{formatTs(inv.maturesOn)}</td>
                            <td className="px-4 py-4">
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
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  }[accent];

  return (
    <div className="card-padded hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-5">
        <p className="section-title">{label}</p>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${accentColor}`}>
          <IconCmp className="w-5 h-5" />
        </div>
      </div>
      <p className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">{value}</p>
    </div>
  );
}

function StatusCard({ label, value, accent, icon }) {
  const IconCmp = icon;
  const styles = {
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-400' },
    blue: { bar: 'bg-blue-500', text: 'text-blue-400' },
  }[accent];
  return (
    <div className="card-padded relative overflow-hidden">
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles.bar}`} />
      <div className="flex items-center justify-between gap-2 pl-1">
        <div>
          <p className="section-title mb-2">{label}</p>
          <p className="font-display text-4xl font-extrabold text-white tracking-tight leading-none">{value}</p>
        </div>
        <IconCmp className={`w-8 h-8 ${styles.text}`} />
      </div>
    </div>
  );
}

export default AnalyticsPage;
