import { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { recordInvestment } from '../services/treasuryService';
import { getAnalytics } from '../services/adminService';

const STATUS_COLORS = {
  Claimed: '#22c55e',
  Matured: '#f59e0b',
  Pending: '#3b82f6',
};

const shortAddr = (addr) =>
  addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '';

const formatTs = (ts) =>
  ts ? new Date(Number(ts) * 1000).toLocaleString() : '-';

const investmentStatus = (inv) => {
  if (inv.isClaimed) return 'Claimed';
  if (inv.isMatured) return 'Matured';
  return 'Pending';
};

function AdminPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  const [investorAddress, setInvestorAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [sortBy, setSortBy] = useState('startTime');
  const [sortDir, setSortDir] = useState('desc');

  const amountUSD = useMemo(() => {
    const amount = Number(tokenAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    return amount * 1000;
  }, [tokenAmount]);

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormMessage('');

    if (amountUSD === 0) {
      setFormError('Please enter a valid number of tokens.');
      return;
    }

    setFormLoading(true);
    try {
      const data = await recordInvestment({ investorAddress, amountUSD });
      setFormMessage(`Investment recorded successfully! Tx Hash: ${data.txHash}`);
      setInvestorAddress('');
      setTokenAmount('');
      loadAnalytics();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const sortedInvestments = useMemo(() => {
    if (!analytics?.investments) return [];
    const arr = [...analytics.investments];
    arr.sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];
      if (sortBy === 'username' || sortBy === 'ethAddress') {
        av = (av || '').toString().toLowerCase();
        bv = (bv || '').toString().toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortBy === 'status') {
        av = investmentStatus(a);
        bv = investmentStatus(b);
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = Number(av);
      bv = Number(bv);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [analytics, sortBy, sortDir]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key) => (sortBy === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const summary = analytics?.summary;

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
    <div className="admin-dashboard">
      <h1>Admin Panel</h1>

      <section className="admin-section">
        <div className="section-header">
          <h2>Overview</h2>
          <button
            className="refresh-button"
            onClick={loadAnalytics}
            disabled={loadingAnalytics}
          >
            {loadingAnalytics ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {analyticsError && <p className="error-message">{analyticsError}</p>}
        {loadingAnalytics && !analytics && <p>Loading analytics...</p>}

        {summary && (
          <>
            <div className="stats-grid">
              <StatCard label="Total Invested" value={`${summary.totalUSDInvested} USD`} />
              <StatCard label="BEET Minted" value={`${summary.totalBEETMinted}`} />
              <StatCard label="Investments" value={summary.totalInvestments} />
              <StatCard label="Active Investors" value={`${summary.uniqueInvestors} / ${summary.totalUsers}`} />
            </div>

            <div className="stats-grid stats-grid-secondary">
              <StatCard label="Claimed" value={summary.claimedCount} accent={STATUS_COLORS.Claimed} />
              <StatCard label="Matured (unclaimed)" value={summary.maturedUnclaimedCount} accent={STATUS_COLORS.Matured} />
              <StatCard label="Pending" value={summary.pendingCount} accent={STATUS_COLORS.Pending} />
            </div>
          </>
        )}
      </section>

      {summary && summary.totalInvestments > 0 && (
        <section className="admin-section">
          <h2>Charts</h2>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Investment Status</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p>No data.</p>
              )}
            </div>

            <div className="chart-card">
              <h3>Top 5 Investors (USD)</h3>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="USD" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>No data.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {summary && (
        <section className="admin-section">
          <h2>All Investments</h2>
          {sortedInvestments.length === 0 ? (
            <p>No investments recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')}>ID{sortIndicator('id')}</th>
                    <th onClick={() => handleSort('username')}>User{sortIndicator('username')}</th>
                    <th onClick={() => handleSort('ethAddress')}>Address{sortIndicator('ethAddress')}</th>
                    <th onClick={() => handleSort('amountUSD')}>Amount (USD){sortIndicator('amountUSD')}</th>
                    <th onClick={() => handleSort('startTime')}>Start{sortIndicator('startTime')}</th>
                    <th onClick={() => handleSort('maturesOn')}>Matures{sortIndicator('maturesOn')}</th>
                    <th onClick={() => handleSort('status')}>Status{sortIndicator('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvestments.map((inv) => {
                    const status = investmentStatus(inv);
                    return (
                      <tr key={inv.id}>
                        <td>{inv.id}</td>
                        <td>{inv.username}</td>
                        <td title={inv.ethAddress}>{shortAddr(inv.ethAddress)}</td>
                        <td>{inv.amountUSD}</td>
                        <td>{formatTs(inv.startTime)}</td>
                        <td>{formatTs(inv.maturesOn)}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: STATUS_COLORS[status] }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="admin-section">
        <h2>Record Investment</h2>
        <form onSubmit={handleSubmit} className="record-form">
          <div className="form-group">
            <label>Investor's Ethereum Address</label>
            <input
              type="text"
              value={investorAddress}
              onChange={(e) => setInvestorAddress(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Number of BEET Tokens</label>
            <input
              type="number"
              min="1"
              step="1"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              required
            />
          </div>
          {amountUSD > 0 && (
            <p><strong>Calculated Amount:</strong> {amountUSD} USD</p>
          )}
          <button type="submit" disabled={formLoading}>
            {formLoading ? 'Submitting Transaction...' : 'Record Investment'}
          </button>
        </form>
        {formMessage && <p className="success-message">{formMessage}</p>}
        {formError && <p className="error-message">{formError}</p>}
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default AdminPage;
