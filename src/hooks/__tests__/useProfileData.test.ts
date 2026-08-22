import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useProfileData } from '@/src/hooks/useProfileData';
import { apiGet, apiPatch, apiPost } from '@/src/services/api';
import type { Session } from '@/src/contexts/AuthContext';

jest.mock('@/src/services/api', () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPatch = apiPatch as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

const baseSession: Session = {
  access_token: 'token-123',
  user: { id: 'u1', full_name: 'Asha Vendor', phone: '0754000000', email: 'asha@example.com' },
};

function makeParams(overrides: Partial<{ session: Session | null }> = {}) {
  return {
    session: baseSession,
    setSession: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useProfileData', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    alertSpy.mockRestore();
  });

  it('seeds the edit form from the session user on mount', () => {
    const params = makeParams();
    mockedApiGet.mockResolvedValue({});
    const { result } = renderHook(() => useProfileData(params));

    expect(result.current.formData).toEqual({ full_name: 'Asha Vendor', phone: '0754000000' });
  });

  it('fetches the latest profile and merges it into the session on mount', async () => {
    const params = makeParams();
    mockedApiGet.mockResolvedValue({ profile: { phone: '0755999999' } });
    renderHook(() => useProfileData(params));

    await waitFor(() => expect(params.setSession).toHaveBeenCalled());
    expect(params.setSession).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ phone: '0755999999' }) })
    );
  });

  it('does not fetch the profile when there is no access token', () => {
    const params = makeParams({ session: null });
    renderHook(() => useProfileData(params));
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('updates the profile and exits edit mode on success', async () => {
    const params = makeParams();
    mockedApiGet.mockResolvedValue({});
    mockedApiPatch.mockResolvedValue({ profile: { full_name: 'Asha V.' } });
    const { result } = renderHook(() => useProfileData(params));

    act(() => result.current.setEditing(true));

    await act(async () => {
      await result.current.handleUpdateProfile();
    });

    expect(mockedApiPatch).toHaveBeenCalledWith('/profile', result.current.formData, 'token-123');
    expect(result.current.editing).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Profile updated successfully');
  });

  it('rejects a password change when the confirmation does not match', async () => {
    const params = makeParams();
    mockedApiGet.mockResolvedValue({});
    const { result } = renderHook(() => useProfileData(params));

    act(() => {
      result.current.setPasswordData({ current: 'old', newPw: 'newpass1', confirm: 'newpass2' });
    });

    await act(async () => {
      await result.current.handlePasswordChange();
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', "Passwords don't match");
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('changes the password and clears the form on success', async () => {
    const params = makeParams();
    mockedApiGet.mockResolvedValue({});
    mockedApiPost.mockResolvedValue({});
    const { result } = renderHook(() => useProfileData(params));

    act(() => {
      result.current.setPasswordData({ current: 'old', newPw: 'newpass1', confirm: 'newpass1' });
    });

    await act(async () => {
      await result.current.handlePasswordChange();
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/auth/change-password',
      { currentPassword: 'old', newPassword: 'newpass1' },
      'token-123'
    );
    expect(result.current.passwordData).toEqual({ current: '', newPw: '', confirm: '' });
  });

  it('logs out and redirects on handleLogout', async () => {
    const params = makeParams();
    mockedApiGet.mockResolvedValue({});
    const { result } = renderHook(() => useProfileData(params));

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(params.logout).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
