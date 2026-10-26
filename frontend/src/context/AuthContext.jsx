import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const STORAGE_KEY = 'examora_user';
const TOKEN_KEY = 'examora_token';

// Keep user data consistent across login and session responses.
function normalizeUser(raw) {
  if (!raw) return null;
  const source = raw.user || raw; // some backends wrap the user in { user, token }
  const role = (source.role || source.user_role || (source.is_admin ? 'admin' : 'student') || 'student')
    .toString()
    .toLowerCase();

  return {
    id: source.id ?? source.user_id,
    name: source.name || source.username || source.full_name || source.email || 'User',
    email: source.email,
    role: role.includes('admin') ? 'admin' : 'student',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }

    api.get('/session')
      .then(({ data }) => setUser(normalizeUser(data)))
      .catch(() => {
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  function loginSuccess(response) {
    const normalized = normalizeUser(response);
    if (response?.token || response?.access_token) {
      localStorage.setItem(TOKEN_KEY, response.token || response.access_token);
    }
    setUser(normalized);
    return normalized;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, ready, loginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
