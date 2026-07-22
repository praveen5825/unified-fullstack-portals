import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || '/accounts/login/';
const ME_ENDPOINT = '/accounts/me/';

/** Derive up-to-2-character initials from a user object */
function getInitials(profile) {
  if (!profile) return 'U';
  if (profile.first_name && profile.last_name) {
    return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  }
  if (profile.first_name) return profile.first_name.slice(0, 2).toUpperCase();
  if (profile.username) return profile.username.slice(0, 2).toUpperCase();
  return 'U';
}

/** Human-readable display name */
function getDisplayName(profile) {
  if (!profile) return 'User';
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  if (profile.first_name) return profile.first_name;
  return profile.username || 'User';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    return token ? { authenticated: true } : null;
  });
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch profile from /me — called after login and on app boot
  const fetchProfile = useCallback(async () => {
    try {
      const res = await client.get(ME_ENDPOINT);
      const profile = res.data;
      setUserProfile({
        ...profile,
        initials: getInitials(profile),
        displayName: getDisplayName(profile),
      });
    } catch {
      // Token expired or invalid — don't crash; the 401 interceptor handles redirect
      setUserProfile(null);
    }
  }, []);

  // On app boot: if a token is already stored, hydrate the profile
  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      fetchProfile();
    }
  }, [fetchProfile]);

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

      // Immediately fetch real user info after successful login
      try {
        const meRes = await client.get(ME_ENDPOINT, {
          headers: { Authorization: `Bearer ${access}` },
        });
        const profile = meRes.data;
        setUserProfile({
          ...profile,
          initials: getInitials(profile),
          displayName: getDisplayName(profile),
        });
      } catch {
        // Non-fatal: profile defaults gracefully
      }

      return true;
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Login failed. Check your username and password.';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setUserProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, login, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

