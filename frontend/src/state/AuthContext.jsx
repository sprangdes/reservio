import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.me();
      setMe(res.data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    me,
    loading,
    refresh,
    setMe
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
