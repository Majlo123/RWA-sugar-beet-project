import { useState, useMemo } from 'react'; // Dodajemo useMemo hook
import { recordInvestment } from '../services/treasuryService';

function AdminPage() {
  const [investorAddress, setInvestorAddress] = useState('');
  // Stanje sada prati broj tokena, ne USD
  const [tokenAmount, setTokenAmount] = useState(''); 
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Automatski izračunavamo USD iznos na osnovu unetih tokena
  const amountUSD = useMemo(() => {
    const amount = Number(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      return 0;
    }
    return amount * 1000;
  }, [tokenAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validacija sada proverava da li je unet validan broj tokena
    if (amountUSD === 0) {
        setError('Please enter a valid number of tokens.');
        return;
    }

    setLoading(true);

    try {
      // Šaljemo izračunati USD iznos na backend
      const investmentData = { investorAddress, amountUSD };
      const data = await recordInvestment(investmentData);
      setMessage(`Investment recorded successfully! Transaction Hash: ${data.txHash}`);
      // Resetujemo formu nakon uspeha
      setInvestorAddress('');
      setTokenAmount('');
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
        
        {/* Prikazujemo izračunati iznos u USD */}
        {amountUSD > 0 && (
          <div className="form-group">
            <p><strong>Calculated Amount:</strong> {amountUSD} USD</p>
          </div>
        )}

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