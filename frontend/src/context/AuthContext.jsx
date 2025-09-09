import { createContext, useState, useContext, useEffect } from 'react';
import { getProfile } from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);

  // --- AŽURIRANA FUNKCIJA ---
  const connectWallet = async () => {
    // Proveravamo da li je korisnik ulogovan pre povezivanja
    if (!user) {
      alert("Please log in before connecting your wallet.");
      return;
    }

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          const selectedAccount = accounts[0];

          // Proveravamo da li se adresa iz MetaMask-a poklapa sa registrovanom adresom
          if (user.ethAddress.toLowerCase() === selectedAccount.toLowerCase()) {
            setAccount(selectedAccount);
            console.log("Connected account:", selectedAccount);
          } else {
            // Ako se adrese ne poklapaju, ne postavljamo nalog i obaveštavamo korisnika
            setAccount(null);
            alert(`Connection failed: Please select the correct account (${user.ethAddress}) in MetaMask.`);
          }
        }
      } catch (error) {
        console.error("User denied account access", error);
      }
    } else {
      alert("Please install a browser wallet like MetaMask!");
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profileData = await getProfile();
          setUser(profileData);
        } catch (error) {
          console.error("Invalid token, logging out.");
          localStorage.removeItem('token');
        }
      }
    };
    checkUser();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          // Kada korisnik promeni nalog, ažuriramo stanje
          // Možemo odmah proveriti i da li se poklapa sa ulogovanim korisnikom
          if (user && accounts[0].toLowerCase() === user.ethAddress.toLowerCase()) {
            setAccount(accounts[0]);
          } else {
             // Ako se ne poklapa (ili niko nije ulogovan), resetujemo povezani nalog
            setAccount(null);
          }
        } else {
          setAccount(null);
        }
      });
    }
  }, [user]); // Dodajemo 'user' kao zavisnost da bi se provera izvršila ponovo kad se korisnik uloguje

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
    <AuthContext.Provider value={{ user, account, login, logout, connectWallet }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};