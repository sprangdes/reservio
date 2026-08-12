import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api';

export interface AuthUser {
  role?: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  lineLoginLinked?: boolean;
  lineLoginSession?: boolean;
  business?: {
    id?: string | number;
    name?: string;
    category?: string;
    phone?: string;
    address?: string;
    slotInterval?: string | number;
  };
  [key: string]: unknown;
}

interface AuthContextValue {
  me: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  setMe: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: Readonly<AuthProviderProps>) {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = (await api.me()) as { data?: AuthUser };
      const user = res?.data ?? null;
      setMe(user);
      return user;
    } catch {
      setMe(null);
      return null;
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

  const value = useMemo<AuthContextValue>(
    () => ({
      me,
      loading,
      refresh,
      setMe
    }),
    [me, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
