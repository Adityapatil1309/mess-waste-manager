import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from './jwtDecode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Fallback if exp is missing to avoid immediate logout
        const expiry = decoded.exp ? decoded.exp * 1000 : Date.now() + 86400000;
        
        if (expiry > Date.now()) {
          setUser({
            id: decoded.id,
            name: decoded.name,
            email: decoded.sub || decoded.email,
            role: decoded.role,
            organization_code: decoded.org_code,
            org_code: decoded.org_code,
            invite_code: decoded.invite_code,
            profile_image: `http://localhost:8000/uploads/user_${decoded.id}.jpg?t=${Date.now()}`,
          });
        } else {
          console.warn('Token expired, clearing session');
          localStorage.removeItem('token');
        }
      } catch (e) {
        console.error('Initial auth failed:', e);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    setUser({
      id: decoded.id,
      name: decoded.name,
      email: decoded.sub,
      role: decoded.role,
      organization_code: decoded.org_code,
      org_code: decoded.org_code,
      invite_code: decoded.invite_code,
      profile_image: `http://localhost:8000/uploads/user_${decoded.id}.jpg?t=${Date.now()}`,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
