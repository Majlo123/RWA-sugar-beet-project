import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext'; // <-- Uvozimo

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // <-- Koristimo login iz AuthContext-a

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const credentials = { username, password };
      const data = await loginUser(credentials);
      if (data.token) {
        await login(data.token); // Pozivamo login funkciju iz konteksta
        navigate('/profile'); 
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    // ... ostatak JSX forme ostaje isti ...
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default LoginPage;