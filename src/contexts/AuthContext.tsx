import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, getApiBaseUrl, setOn401Handler } from '@/src/services/api';


const SESSION_KEY = '@tolatola/session';

/**
 * How long (ms) before the access token's expiry we should proactively refresh.
 * Default: 5 minutes before expiry.
 */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Maximum session age (ms). Sessions older than this are considered expired
 * even if they haven't been explicitly invalidated.
 * Default: 30 days.
 */
const MAX_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Key to track when the session was first created (login time).
 */
const SESSION_CREATED_KEY = '@tolatola/session_created_at';

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

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Clear any scheduled proactive refresh timer.
   */
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const setSession = useCallback(async (session: Session | null) => {
    clearRefreshTimer();
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.multiRemove([SESSION_KEY, SESSION_CREATED_KEY]);
    }
    setState({
      session,
      isLoading: false,
      isAuthenticated: !!session,
    });
  }, [clearRefreshTimer]);

  /**
   * Attempt a silent token refresh using the stored refresh_token.
   * Returns the new access_token on success, or null on failure.
   *
   * IMPORTANT: On network failures, this returns null but does NOT
   * clear the stored session — the user stays "logged in" with their
   * current token, which may still work or will be retried later.
   */
  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Session;
      if (!parsed?.refresh_token) return null;

      // Check if the session has exceeded the maximum age (30 days)
      const createdAtStr = await AsyncStorage.getItem(SESSION_CREATED_KEY);
      if (createdAtStr) {
        const createdAt = parseInt(createdAtStr, 10);
        if (Date.now() - createdAt > MAX_SESSION_AGE_MS) {
          console.log('[AUTH] Session exceeded 30-day maximum age. Logging out.');
          await setSession(null);
          return null;
        }
      }

      console.log('[AUTH] Attempting silent token refresh...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: parsed.refresh_token }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[AUTH] Token refresh failed with status:', response.status);
        // On 4xx errors (except network), the refresh token is likely invalid
        if (response.status >= 400 && response.status < 500) {
          console.log('[AUTH] Refresh token rejected by server. Clearing session.');
          await setSession(null);
        }
        // On 5xx, keep session — server may be temporarily down
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
    } catch (err: any) {
      // Network errors (no connectivity, DNS failure, timeout) — keep the session
      const isNetworkError =
        err?.name === 'AbortError' ||
        err?.message?.includes('Network request failed') ||
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('Failed to fetch');

      if (isNetworkError) {
        console.warn('[AUTH] Token refresh failed due to network issue. Keeping session active.');
      } else {
        console.error('[AUTH] Silent session refresh error:', err);
      }
    }
    return null;
  }, [setSession]);

  /**
   * Schedule a proactive refresh before the access token expires.
   */
  const scheduleProactiveRefresh = useCallback((session: Session) => {
    clearRefreshTimer();

    if (!session.expires_at) return;

    // expires_at is typically a Unix timestamp in seconds
    const expiresAtMs = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilRefresh = expiresAtMs - now - REFRESH_BUFFER_MS;

    if (timeUntilRefresh <= 0) {
      // Already near/past expiry — refresh immediately
      console.log('[AUTH] Token near/past expiry. Refreshing immediately.');
      refreshSession();
      return;
    }

    console.log(`[AUTH] Scheduling proactive refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    refreshTimerRef.current = setTimeout(() => {
      console.log('[AUTH] Proactive token refresh triggered.');
      refreshSession();
    }, timeUntilRefresh);
  }, [clearRefreshTimer, refreshSession]);

  // Register 401 interceptor callback
  useEffect(() => {
    setOn401Handler(refreshSession);
    return () => {
      setOn401Handler(() => Promise.resolve(null));
    };
  }, [refreshSession]);

  // Schedule proactive refresh whenever session changes
  useEffect(() => {
    if (state.session?.expires_at) {
      scheduleProactiveRefresh(state.session);
    }
    return () => clearRefreshTimer();
  }, [state.session, scheduleProactiveRefresh, clearRefreshTimer]);

  // Refresh token when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        state.session?.refresh_token
      ) {
        console.log('[AUTH] App came to foreground. Checking token freshness...');

        // Only refresh if the token is within the refresh buffer of expiring
        if (state.session.expires_at) {
          const expiresAtMs = state.session.expires_at * 1000;
          const timeUntilExpiry = expiresAtMs - Date.now();

          if (timeUntilExpiry < REFRESH_BUFFER_MS) {
            console.log('[AUTH] Token near expiry on foreground. Refreshing...');
            refreshSession();
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [state.session, refreshSession]);

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
      // Store the login timestamp for 30-day max session tracking
      await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());
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
        await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());
        await setSession(session);
      } else {
        setState(s => ({ ...s, session: null, isAuthenticated: false, isLoading: false }));
      }
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();
    const token = state.session?.access_token;
    try {
      if (token) {
        await apiPost('/auth/logout', undefined, token);
      }
    } finally {
      await setSession(null);
    }
  }, [state.session?.access_token, setSession, clearRefreshTimer]);

  // Boot: restore session from storage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (cancelled) return;
        const parsed = raw ? (JSON.parse(raw) as Session) : null;

        if (!parsed?.access_token) {
          // No stored session at all
          setState({ session: null, isLoading: false, isAuthenticated: false });
          return;
        }

        // Check 30-day session age limit
        const createdAtStr = await AsyncStorage.getItem(SESSION_CREATED_KEY);
        if (createdAtStr) {
          const createdAt = parseInt(createdAtStr, 10);
          if (Date.now() - createdAt > MAX_SESSION_AGE_MS) {
            console.log('[AUTH] Stored session exceeded 30-day limit. Clearing.');
            await AsyncStorage.multiRemove([SESSION_KEY, SESSION_CREATED_KEY]);
            setState({ session: null, isLoading: false, isAuthenticated: false });
            return;
          }
        }

        // Restore the session immediately so the user sees the app right away.
        // This prevents the user from being flashed to a login screen.
        setState({
          session: parsed,
          isLoading: false,
          isAuthenticated: true,
        });

        // Then attempt a background refresh if we have a refresh_token
        if (parsed.refresh_token) {
          // Don't block UI — refresh in background
          refreshSession().catch(() => {
            // Silently ignore — user stays logged in with existing token
            console.warn('[AUTH] Background refresh on boot failed. Keeping existing session.');
          });
        }
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
