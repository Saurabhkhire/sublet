import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api('GET', '/api/auth/me');
          setUser(user);
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email, password) {
    const data = await api('POST', '/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(email, password, linkedin) {
    const data = await api('POST', '/api/auth/register', { email, password, linkedin });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const isAdmin = user?.role === 'admin';
  const isJudge = isAdmin || user?.is_judge === 1;

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, isAdmin, isJudge }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
