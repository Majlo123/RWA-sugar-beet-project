import { useState } from 'react';
import { recordInvestment } from '../services/treasuryService';

function AdminPage() {
  const [investorAddress, setInvestorAddress] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
     if (Number(amountUSD) % 1000 !== 0) {
    setError('Investment amount must be a multiple of 1000.');
    return; // Zaustavljamo izvršavanje ako iznos nije validan
    }
    try {
      const investmentData = { investorAddress, amountUSD: Number(amountUSD) };
      const data = await recordInvestment(investmentData);
      setMessage(`Investment recorded successfully! Transaction Hash: ${data.txHash}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Admin Panel - Record Investment</h2>
      <form onSubmit={handleSubmit}>
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
          <label>Amount (USD)</label>
          <input 
            type="number" 
            value={amountUSD} 
            onChange={(e) => setAmountUSD(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting Transaction...' : 'Record Investment'}
        </button>
      </form>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default AdminPage;