import { useState } from 'react';
import { registerUser } from '../services/authService'; // Uvozimo naš servis

function RegisterPage() {
  // Definišemo stanje za svako polje u formi
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ethAddress, setEthAddress] = useState('');

  // Stanje za poruke korisniku
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); // Sprečava ponovno učitavanje stranice
    setError('');
    setMessage('');

    try {
      const userData = { username, password, ethAddress };
      const data = await registerUser(userData);
      setMessage(data.message); // Prikazujemo poruku o uspehu sa servera
    } catch (err) {
      setError(err.message); // Prikazujemo poruku o grešci
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Ethereum Address</label>
          <input 
            type="text" 
            value={ethAddress} 
            onChange={(e) => setEthAddress(e.target.value)} 
            required 
          />
        </div>
        <button type="submit">Register</button>
      </form>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default RegisterPage;