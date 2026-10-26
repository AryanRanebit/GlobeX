import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '') + '/api/v1/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('globex_token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('globex_user');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('globex_user');
        localStorage.removeItem('globex_token');
      }
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const persistAuth = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('globex_token', accessToken);
    localStorage.setItem('globex_user', JSON.stringify(userData));
  };

  const signup = useCallback(async ({ name, email, password, role, companyName, companyType, industry }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, companyName, companyType, industry }),
      });

      let data;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok || !data) {
        throw new Error(data?.message || data?.error || 'Signup failed. Please try again.');
      }

      // Attach role to user object (stored locally since backend mock doesn't have it)
      const userData = { ...data.data.user, role: role || 'BUYER' };
      persistAuth(userData, data.data.tokens.accessToken);
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Network error. Is the backend running?';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok || !data) {
        throw new Error(data?.message || data?.error || 'Invalid email or password.');
      }

      const userData = data.data.user;
      persistAuth(userData, data.data.tokens.accessToken);
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Network error. Is the backend running?';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('globex_token');
    localStorage.removeItem('globex_user');
  }, []);

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, error, isAuthenticated, signup, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
