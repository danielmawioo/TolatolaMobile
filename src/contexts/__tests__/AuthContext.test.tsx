import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth, type Session } from '@/src/contexts/AuthContext';
import { apiPost, getApiBaseUrl, setOn401Handler } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiPost = apiPost as jest.Mock;
const mockedSetOn401Handler = setOn401Handler as jest.Mock;

const SESSION_KEY = '@tolatola/session';
const SESSION_CREATED_KEY = '@tolatola/session_created_at';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

describe('AuthContext', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('throws when useAuth is used outside of an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });

  it('resolves to an unauthenticated state when there is no stored session', async () => {
    const { result, unmount } = renderAuth();

    // Immediately after mount, the boot restore is still in flight.
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();

    unmount();
  });

  it('restores a persisted session from storage on boot', async () => {
    const storedSession: Session = {
      access_token: 'stored-token',
      user: { id: 'u1', email: 'stored@example.com' },
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(storedSession));
    await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toEqual(storedSession);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe('stored-token');

    unmount();
  });

  it('clears a stored session that has exceeded the 30-day maximum age', async () => {
    const staleSession: Session = {
      access_token: 'stale-token',
      user: { id: 'u1' },
    };
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(staleSession));
    await AsyncStorage.setItem(SESSION_CREATED_KEY, thirtyOneDaysAgo.toString());

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_CREATED_KEY)).toBeNull();

    unmount();
  });

  it('treats a stored session missing an access_token as logged out', async () => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: { id: 'u1' } }));

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    unmount();
  });

  it('recovers gracefully from corrupted JSON in storage', async () => {
    await AsyncStorage.setItem(SESSION_KEY, 'not-valid-json{');

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    unmount();
  });

  it('login stores the session, persists it to storage, and returns the user', async () => {
    const user = { id: 'u1', email: 'a@example.com', full_name: 'A B' };
    mockedApiPost.mockResolvedValueOnce({
      user,
      session: { access_token: 'new-token', refresh_token: 'new-refresh' },
    });

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returnedUser: unknown;
    await act(async () => {
      returnedUser = await result.current.login('a@example.com', 'password123');
    });

    expect(mockedApiPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@example.com',
      password: 'password123',
    });
    expect(returnedUser).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe('new-token');
    expect(result.current.session?.user).toEqual(user);

    const stored = await AsyncStorage.getItem(SESSION_KEY);
    expect(JSON.parse(stored as string)).toMatchObject({ access_token: 'new-token', user });
    expect(await AsyncStorage.getItem(SESSION_CREATED_KEY)).not.toBeNull();

    unmount();
  });

  it('propagates a login failure and leaves the state unauthenticated', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.login('a@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();

    unmount();
  });

  it('logout calls the logout endpoint with the access token and clears session/storage', async () => {
    const user = { id: 'u1' };
    mockedApiPost.mockResolvedValueOnce({
      user,
      session: { access_token: 'token-to-clear' },
    });

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('a@example.com', 'password123');
    });
    expect(result.current.isAuthenticated).toBe(true);

    mockedApiPost.mockResolvedValueOnce(undefined); // /auth/logout response
    await act(async () => {
      await result.current.logout();
    });

    expect(mockedApiPost).toHaveBeenCalledWith('/auth/logout', undefined, 'token-to-clear');
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();

    unmount();
  });

  it('logout does not call the logout endpoint when there is no active session', async () => {
    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedApiPost).not.toHaveBeenCalledWith('/auth/logout', expect.anything(), expect.anything());
    expect(result.current.isAuthenticated).toBe(false);

    unmount();
  });

  it('clears the local session even when the logout API call fails', async () => {
    mockedApiPost.mockResolvedValueOnce({
      user: { id: 'u1' },
      session: { access_token: 'token-to-clear' },
    });

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('a@example.com', 'password123');
    });

    mockedApiPost.mockRejectedValueOnce(new Error('server unreachable'));
    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow('server unreachable');
    });

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();

    unmount();
  });

  it('registers a 401 handler that clears the session when the refresh token is rejected by the server', async () => {
    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedSetOn401Handler).toHaveBeenCalledWith(expect.any(Function));
    const registeredHandler = mockedSetOn401Handler.mock.calls[0][0] as () => Promise<string | null>;

    // Establish an authenticated session with a refresh token so refreshSession has
    // something to work with.
    mockedApiPost.mockResolvedValueOnce({
      user: { id: 'u1' },
      session: { access_token: 'access-1', refresh_token: 'refresh-1' },
    });
    await act(async () => {
      await result.current.login('a@example.com', 'password123');
    });
    expect(result.current.isAuthenticated).toBe(true);

    // Simulate the API layer invoking the 401 handler; the server rejects the
    // refresh token (4xx), which should force a logout.
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid refresh token' }),
    }) as any;

    await act(async () => {
      await registeredHandler();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${getApiBaseUrl()}/auth/refresh`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();

    unmount();
  });

  it('signup stores a session when the API returns one', async () => {
    const user = { id: 'u2', email: 'new@example.com' };
    mockedApiPost.mockResolvedValueOnce({
      user,
      session: { access_token: 'signup-token' },
    });

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup({
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
        phone: '0700000000',
        userType: 'customer',
      });
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({ email: 'new@example.com', user_type: 'customer' })
    );
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe('signup-token');

    unmount();
  });

  it('signup leaves the user unauthenticated when the API returns no session', async () => {
    mockedApiPost.mockResolvedValueOnce({ user: { id: 'u3' }, session: null });

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup({
        email: 'pending@example.com',
        password: 'password123',
        fullName: 'Pending User',
        phone: '0700000001',
        userType: 'vendor',
      });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);

    unmount();
  });

  it('switchRole updates the user_type on the session and persists it', async () => {
    mockedApiPost.mockResolvedValueOnce({
      user: { id: 'u1', user_type: 'customer' },
      session: { access_token: 'token-1' },
    });

    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('a@example.com', 'password123');
    });

    mockedApiPost.mockResolvedValueOnce(undefined); // /profile/switch-role response
    await act(async () => {
      await result.current.switchRole('vendor');
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/profile/switch-role',
      { role: 'vendor' },
      'token-1'
    );
    expect(result.current.session?.user.user_type).toBe('vendor');

    const stored = await AsyncStorage.getItem(SESSION_KEY);
    expect(JSON.parse(stored as string)).toMatchObject({ user: { user_type: 'vendor' } });

    unmount();
  });
});
