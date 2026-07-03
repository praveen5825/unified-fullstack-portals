import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || '/accounts/login/';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    return token ? { authenticated: true } : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.post(LOGIN_ENDPOINT, { username, password });
      // Handles both simplejwt's default {access, refresh} and a custom
      // {access_token, refresh_token} shape -- whichever your accounts app returns.
      const access = res.data.access ?? res.data.access_token;
      const refresh = res.data.refresh ?? res.data.refresh_token;
      if (!access) throw new Error('No access token in response');

      localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      setUser({ authenticated: true });
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.message
        || 'Login failed. Check your username and password.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
