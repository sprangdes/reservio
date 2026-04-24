import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import { api } from '../api.js';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider(props) {
  const { children } = props;
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
    const loadAuth = async () => {
      await refresh();
    };

    loadAuth().catch(() => {
      // ignored on purpose
    });
  }, [refresh]);

  const value = useMemo(() => ({
    me,
    loading,
    refresh,
    setMe
  }), [me, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  return useContext(AuthContext);
}
