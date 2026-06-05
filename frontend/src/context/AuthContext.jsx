import { createContext, useState, useContext, useEffect } from 'react';
import { getProfile } from '../services/userService';

const AuthContext = createContext(null);

const POLYGON_CHAIN_ID = '0x89'; // 137 decimal

export async function ensurePolygonNetwork() {
  if (!window.ethereum) return;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId === POLYGON_CHAIN_ID) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_CHAIN_ID }],
    });
  } catch (err) {
    // Chain not added yet in MetaMask — add it automatically
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: POLYGON_CHAIN_ID,
          chainName: 'Polygon PoS',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
        }],
      });
    } else {
      throw err;
    }
  }
}

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
      await ensurePolygonNetwork();
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
