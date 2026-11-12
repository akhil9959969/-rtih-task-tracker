import { createContext, useContext, useEffect, useState } from 'react';
import { api, setCsrfToken } from '../lib/api';

/** Session state: who is logged in, resolved once on first load. */
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((data) => {
        if (data.csrf_token) setCsrfToken(data.csrf_token);
        setUser(data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    async login(email, password) {
      const data = await api.login(email, password);
      setUser(data.user);
    },
    async register(name, email, password) {
      const data = await api.register(name, email, password);
      setUser(data.user);
    },
    async logout() {
      await api.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
