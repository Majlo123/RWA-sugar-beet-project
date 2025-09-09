import { createContext, useState, useContext, useEffect } from 'react';
import { getProfile } from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profileData = await getProfile();
          setUser(profileData);
        } catch (error) {
          // Ako je token nevažeći, obriši ga
          console.error("Invalid token, logging out.");
          localStorage.removeItem('token');
        }
      }
    };
    checkUser();
  }, []);

  const login = async (token) => {
    localStorage.setItem('token', token);
    const profileData = await getProfile();
    setUser(profileData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};