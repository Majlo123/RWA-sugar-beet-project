import { createContext, useState, useContext, useEffect } from 'react';
import { getProfile } from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const profileData = await getProfile();
      setUser(profileData);
      return profileData;
    } catch (error) {
      console.error('Invalid token, logging out.');
      localStorage.removeItem('token');
      setUser(null);
      return null;
    }
  };

  const connectWallet = async () => {
    if (!user) {
      alert('Please log in before connecting your wallet.');
      return;
    }
    if (!window.ethereum) {
      alert('Please install a browser wallet like MetaMask!');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) return;

      const selected = accounts[0];
      if (user.ethAddress.toLowerCase() === selected.toLowerCase()) {
        setAccount(selected);
      } else {
        setAccount(null);
        alert(`Connection failed: Please select the correct account (${user.ethAddress}) in MetaMask.`);
      }
    } catch (error) {
      console.error('User denied account access', error);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handler = (accounts) => {
      if (accounts.length > 0 && user && accounts[0].toLowerCase() === user.ethAddress.toLowerCase()) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };
    window.ethereum.on('accountsChanged', handler);
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handler);
      }
    };
  }, [user]);

  const login = async (token) => {
    localStorage.setItem('token', token);
    const profileData = await getProfile();
    setUser(profileData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAccount(null);
  };

  return (
    <AuthContext.Provider value={{ user, account, login, logout, connectWallet, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
