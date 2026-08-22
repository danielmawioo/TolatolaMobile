import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import {
  BuyerLocationProvider,
  useBuyerLocation,
} from '@/src/contexts/BuyerLocationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { loadSavedDeliverySnapshot } from '@/src/lib/savedDeliveryAddress';
import {
  getForegroundLocationPermission,
  readDeviceCoordinatesIfAllowed,
  requestForegroundLocationPermission,
} from '@/src/lib/deviceLocation';

jest.mock('@/src/contexts/AuthContext');
jest.mock('@/src/lib/savedDeliveryAddress');
jest.mock('@/src/lib/deviceLocation');

const mockedUseAuth = useAuth as jest.Mock;
const mockedLoadSavedDeliverySnapshot = loadSavedDeliverySnapshot as jest.Mock;
const mockedGetForegroundLocationPermission = getForegroundLocationPermission as jest.Mock;
const mockedReadDeviceCoordinatesIfAllowed = readDeviceCoordinatesIfAllowed as jest.Mock;
const mockedRequestForegroundLocationPermission = requestForegroundLocationPermission as jest.Mock;

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockedUseAuth.mockReturnValue({
    session: null,
    isLoading: false,
    isAuthenticated: false,
    accessToken: null,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    setSession: jest.fn(),
    switchRole: jest.fn(),
    ...overrides,
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BuyerLocationProvider>{children}</BuyerLocationProvider>
);

describe('BuyerLocationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
    mockedGetForegroundLocationPermission.mockResolvedValue('undetermined');
    mockedReadDeviceCoordinatesIfAllowed.mockResolvedValue(null);
    mockedLoadSavedDeliverySnapshot.mockResolvedValue(null);
    mockedRequestForegroundLocationPermission.mockResolvedValue('denied');
  });

  it('starts unloaded and becomes loaded with no coords/address when logged out and permission undetermined', async () => {
    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    expect(result.current.isLoaded).toBe(false);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.coords).toBeNull();
    expect(result.current.addressHint).toBeNull();
    expect(result.current.hasProximity).toBe(false);
    expect(result.current.locationPermission).toBe('undetermined');
    expect(mockedReadDeviceCoordinatesIfAllowed).not.toHaveBeenCalled();
    expect(mockedLoadSavedDeliverySnapshot).not.toHaveBeenCalled();
  });

  it('reads device coordinates when permission is granted', async () => {
    mockedGetForegroundLocationPermission.mockResolvedValue('granted');
    mockedReadDeviceCoordinatesIfAllowed.mockResolvedValue({ lat: 1.5, lng: 2.5 });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.locationPermission).toBe('granted');
    expect(result.current.coords).toEqual({ lat: 1.5, lng: 2.5 });
    expect(result.current.hasProximity).toBe(true);
  });

  it('loads the saved delivery snapshot for an authenticated user', async () => {
    mockAuth({
      session: { access_token: 'tok', user: { id: 'user-1' } } as any,
      isAuthenticated: true,
      accessToken: 'tok',
    });
    mockedLoadSavedDeliverySnapshot.mockResolvedValue({
      address: '  123 Main St  ',
      latitude: -1.28,
      longitude: 36.82,
    });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(mockedLoadSavedDeliverySnapshot).toHaveBeenCalledWith('user-1');
    expect(result.current.addressHint).toBe('123 Main St');
    expect(result.current.coords).toEqual({ lat: -1.28, lng: 36.82 });
    expect(result.current.hasProximity).toBe(true);
  });

  it('ignores a saved snapshot with non-finite coordinates but keeps the address hint', async () => {
    mockAuth({
      session: { access_token: 'tok', user: { id: 'user-1' } } as any,
      isAuthenticated: true,
      accessToken: 'tok',
    });
    mockedLoadSavedDeliverySnapshot.mockResolvedValue({
      address: 'No coords here',
      latitude: NaN,
      longitude: NaN,
    });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addressHint).toBe('No coords here');
    expect(result.current.coords).toBeNull();
    expect(result.current.hasProximity).toBe(true);
  });

  it('prefers device coordinates over the saved pin when both are available', async () => {
    mockAuth({
      session: { access_token: 'tok', user: { id: 'user-1' } } as any,
      isAuthenticated: true,
      accessToken: 'tok',
    });
    mockedGetForegroundLocationPermission.mockResolvedValue('granted');
    mockedReadDeviceCoordinatesIfAllowed.mockResolvedValue({ lat: 10, lng: 20 });
    mockedLoadSavedDeliverySnapshot.mockResolvedValue({
      address: 'Saved address',
      latitude: -1.28,
      longitude: 36.82,
    });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.coords).toEqual({ lat: 10, lng: 20 });
  });

  it('falls back to the saved pin when device permission is not granted', async () => {
    mockAuth({
      session: { access_token: 'tok', user: { id: 'user-1' } } as any,
      isAuthenticated: true,
      accessToken: 'tok',
    });
    mockedGetForegroundLocationPermission.mockResolvedValue('denied');
    mockedLoadSavedDeliverySnapshot.mockResolvedValue({
      address: 'Saved address',
      latitude: -1.28,
      longitude: 36.82,
    });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(mockedReadDeviceCoordinatesIfAllowed).not.toHaveBeenCalled();
    expect(result.current.coords).toEqual({ lat: -1.28, lng: 36.82 });
  });

  it('clears coordinates and address when refresh throws', async () => {
    mockAuth({
      session: { access_token: 'tok', user: { id: 'user-1' } } as any,
      isAuthenticated: true,
      accessToken: 'tok',
    });
    mockedGetForegroundLocationPermission.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.coords).toBeNull();
    expect(result.current.addressHint).toBeNull();
    expect(result.current.hasProximity).toBe(false);
  });

  it('clears saved-address state when the user logs out and refresh() reruns', async () => {
    mockAuth({
      session: { access_token: 'tok', user: { id: 'user-1' } } as any,
      isAuthenticated: true,
      accessToken: 'tok',
    });
    mockedLoadSavedDeliverySnapshot.mockResolvedValue({
      address: 'Saved address',
      latitude: -1.28,
      longitude: 36.82,
    });

    const { result, rerender } = renderHook(() => useBuyerLocation(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.addressHint).toBe('Saved address');

    mockAuth();
    rerender({});

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.addressHint).toBeNull();
    expect(result.current.coords).toBeNull();
  });

  it('requestLocationAccess grants access and reads coordinates', async () => {
    mockedRequestForegroundLocationPermission.mockResolvedValue('granted');
    mockedReadDeviceCoordinatesIfAllowed.mockResolvedValue({ lat: 5, lng: 6 });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let permission: string | undefined;
    await act(async () => {
      permission = await result.current.requestLocationAccess();
    });

    expect(permission).toBe('granted');
    expect(result.current.locationPermission).toBe('granted');
    expect(result.current.coords).toEqual({ lat: 5, lng: 6 });
  });

  it('requestLocationAccess clears coords when access is denied', async () => {
    mockedGetForegroundLocationPermission.mockResolvedValue('granted');
    mockedReadDeviceCoordinatesIfAllowed.mockResolvedValue({ lat: 5, lng: 6 });

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.coords).toEqual({ lat: 5, lng: 6 });

    mockedRequestForegroundLocationPermission.mockResolvedValue('denied');

    let permission: string | undefined;
    await act(async () => {
      permission = await result.current.requestLocationAccess();
    });

    expect(permission).toBe('denied');
    expect(result.current.locationPermission).toBe('denied');
    expect(result.current.coords).toBeNull();
  });

  it('requestLocationAccess sets denied when the permission request throws', async () => {
    mockedRequestForegroundLocationPermission.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useBuyerLocation(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let permission: string | undefined;
    await act(async () => {
      permission = await result.current.requestLocationAccess();
    });

    expect(permission).toBe('denied');
    expect(result.current.locationPermission).toBe('denied');
  });

  it('returns a safe default value when used outside of a BuyerLocationProvider', () => {
    const { result } = renderHook(() => useBuyerLocation());

    expect(result.current.coords).toBeNull();
    expect(result.current.addressHint).toBeNull();
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.hasProximity).toBe(false);
    expect(result.current.locationPermission).toBe('undetermined');
    expect(result.current.refresh()).resolves.toBeUndefined();
    expect(result.current.requestLocationAccess()).resolves.toBe('undetermined');
  });
});
