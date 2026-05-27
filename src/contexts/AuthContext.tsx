import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, getApiBaseUrl, setOn401Handler } from '@/src/services/api';


const SESSION_KEY = '@tolatola/session';

export type User = {
  id: string;
  email?: string;
  full_name?: string;
  user_type?: string;
  [key: string]: unknown;
};

export type Session = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: User;
};

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (params: {
    email: string;
    password: string;
    fullName: string;
    userType: 'customer' | 'vendor' | 'transporter';
    vendorType?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setSession = useCallback(async (session: Session | null) => {
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
    setState({
      session,
      isLoading: false,
      isAuthenticated: !!session,
    });
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Session;
      if (!parsed?.refresh_token) return null;

      console.log('[AUTH] Attempting silent token refresh...');
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: parsed.refresh_token }),
      });

      if (!response.ok) {
        console.warn('[AUTH] Token refresh failed with status:', response.status);
        return null;
      }

      const data = await response.json();
      if (data?.session?.access_token) {
        const newSession: Session = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token || parsed.refresh_token,
          expires_at: data.session.expires_at,
          user: data.user || parsed.user,
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        setState({
          session: newSession,
          isLoading: false,
          isAuthenticated: true,
        });
        console.log('[AUTH] Token refreshed successfully!');
        return newSession.access_token;
      }
    } catch (err) {
      console.error('[AUTH] Silent session refresh error:', err);
    }
    return null;
  }, []);

  // Register 401 interceptor callback
  useEffect(() => {
    setOn401Handler(refreshSession);
    return () => {
      setOn401Handler(() => Promise.resolve(null));
    };
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiPost<{ user: User; session: { access_token: string; refresh_token?: string; expires_at?: number } }>(
        '/auth/login',
        { email, password }
      );
      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      };
      await setSession(session);
      return data.user;
    },
    [setSession]
  );

  const signup = useCallback(
    async (params: {
      email: string;
      password: string;
      fullName: string;
      userType: 'customer' | 'vendor' | 'transporter';
      vendorType?: string;
    }) => {
      const body = {
        email: params.email,
        password: params.password,
        full_name: params.fullName,
        user_type: params.userType,
        vendor_type: params.vendorType,
        accepted_policies: true,
      };
      const data = await apiPost<{ user: User; session: { access_token: string; refresh_token?: string; expires_at?: number } }>(
        '/auth/signup',
        body
      );
      
      if (data.session && data.session.access_token) {
        const session: Session = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.user,
        };
        await setSession(session);
      } else {
        setState(s => ({ ...s, session: null, isAuthenticated: false, isLoading: false }));
      }
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    const token = state.session?.access_token;
    try {
      if (token) {
        await apiPost('/auth/logout', undefined, token);
      }
    } finally {
      await setSession(null);
    }
  }, [state.session?.access_token, setSession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (cancelled) return;
        const parsed = raw ? (JSON.parse(raw) as Session) : null;
        
        if (parsed?.refresh_token) {
          const refreshedToken = await refreshSession();
          if (refreshedToken) {
            return;
          }
        }

        setState({
          session: parsed,
          isLoading: false,
          isAuthenticated: !!parsed?.access_token,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      accessToken: state.session?.access_token ?? null,
      login,
      signup,
      logout,
      setSession,
    }),
    [state, login, signup, logout, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
