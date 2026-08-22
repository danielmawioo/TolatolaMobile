import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTrackingStatusData } from '@/src/hooks/useTrackingStatusData';
import { apiGet, apiPost } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

describe('useTrackingStatusData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets an error and stops loading when there is no token', () => {
    const { result } = renderHook(() => useTrackingStatusData(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Missing tracking session. Please start from the track order page.');
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('normalizes and stores the order status payload on success', async () => {
    mockedApiGet.mockResolvedValue({
      data: {
        order: { id: 'o1', order_number: 'ORD-1', status: 'in_transit' },
        timeline: [{ status: 'IN_TRANSIT', completed_at: '2026-01-01T00:00:00Z' }],
        transporter: { name: 'Asha', phone_masked: '07****123' },
        fund_status: { status: 'protected', timeline: [] },
      },
    });

    const { result } = renderHook(() => useTrackingStatusData('tok-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedApiGet).toHaveBeenCalledWith('/tracking/status?token=tok-123');
    expect(result.current.error).toBeNull();
    expect(result.current.data?.order.order_number).toBe('ORD-1');
    expect(result.current.data?.transporter?.name).toBe('Asha');
    expect(result.current.currentIndex).toBe(4); // in_transit maps to index 4
    expect(result.current.progressPercent).toBeCloseTo((5 / 6) * 100);
  });

  it('sets an error message when the order is missing from the response', async () => {
    mockedApiGet.mockResolvedValue(null);

    const { result } = renderHook(() => useTrackingStatusData('tok-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Order status data not found.');
    expect(result.current.data).toBeNull();
  });

  it('confirms delivery, alerts success, and refetches the status', async () => {
    mockedApiGet.mockResolvedValue({
      data: { order: { id: 'o1', status: 'in_transit' }, timeline: [] },
    });
    mockedApiPost.mockResolvedValue({ success: true });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useTrackingStatusData('tok-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleConfirmDelivery();
    });

    expect(mockedApiPost).toHaveBeenCalledWith('/orders/o1/confirm-delivery', {});
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Delivery Confirmed'),
      expect.any(String)
    );
    expect(mockedApiGet).toHaveBeenCalledTimes(2);
    expect(result.current.confirming).toBe(false);

    alertSpy.mockRestore();
  });

  it('alerts an error and keeps prior data when confirming delivery fails', async () => {
    mockedApiGet.mockResolvedValue({
      data: { order: { id: 'o1', status: 'in_transit' }, timeline: [] },
    });
    mockedApiPost.mockRejectedValue(new Error('server down'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useTrackingStatusData('tok-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleConfirmDelivery();
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'server down');
    expect(result.current.confirming).toBe(false);

    alertSpy.mockRestore();
  });
});
