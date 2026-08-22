import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import { usePaymentStatus, STATUS_MAP } from '@/src/hooks/usePaymentStatus';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve()) }));

const mockedApiGet = apiGet as jest.Mock;

describe('usePaymentStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('marks cash-on-delivery orders as paid immediately without polling', async () => {
    mockedApiGet.mockResolvedValueOnce({ data: { id: 'o1', status: 'pending' } });

    const { result } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'cash-on-delivery' }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isCod).toBe(true);
    expect(result.current.paymentStatus).toBe('paid');
    // Only the order-fetch call — no /payments/status polling for COD.
    expect(mockedApiGet).toHaveBeenCalledTimes(1);
  });

  it('marks the order paid immediately when the fetched order is already paid', async () => {
    mockedApiGet.mockResolvedValueOnce({ data: { id: 'o1', status: 'confirmed', payment_status: 'paid' } });

    const { result } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'm-pesa' }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.paymentStatus).toBe('paid');
  });

  it('polls /payments/status and stops once the backend reports paid', async () => {
    mockedApiGet
      .mockResolvedValueOnce({ data: { id: 'o1', status: 'pending' } }) // order fetch
      .mockResolvedValueOnce({ data: { payment_status: 'processing' } }) // poll 1
      .mockResolvedValueOnce({ data: { payment_status: 'paid', status: 'confirmed' } }); // poll 2

    const { result } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'm-pesa', accessToken: 'tok' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2)); // order fetch + first poll tick

    expect(result.current.paymentStatus).toBe('processing');

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(3));

    expect(result.current.paymentStatus).toBe('paid');
    expect(result.current.order?.status).toBe('confirmed');

    // Polling must not schedule another tick once paid.
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockedApiGet).toHaveBeenCalledTimes(3);
  });

  it('stops polling once the backend reports the payment failed', async () => {
    mockedApiGet
      .mockResolvedValueOnce({ data: { id: 'o1', status: 'pending' } }) // order fetch
      .mockResolvedValueOnce({ data: { payment_status: 'failed' } }); // poll 1

    const { result } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'm-pesa' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.paymentStatus).toBe('failed'));

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    // order fetch + single poll — no further calls after failure.
    expect(mockedApiGet).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['pending', 0], ['pending_payment', 0],
    ['confirmed', 1], ['paid', 1],
    ['processing', 2], ['preparing', 2],
    ['dispatched', 3], ['picked_up', 3],
    ['in_transit', 4], ['shipped', 4],
    ['delivered', 5], ['completed', 5],
  ])('maps order status %s to tracking step %i', (status, expectedStep) => {
    expect(STATUS_MAP[status]).toBe(expectedStep);
  });

  it('defaults to step 0 for an unrecognized order status', async () => {
    mockedApiGet.mockResolvedValueOnce({ data: { id: 'o1', status: 'some_unknown_status' } });

    const { result } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'cash-on-delivery' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentStep).toBe(0);
  });

  it('classifies bank and card payment methods', async () => {
    mockedApiGet.mockResolvedValue({ data: { id: 'o1', status: 'pending' } });

    const { result: bank } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'crdb-simbanking' }));
    await waitFor(() => expect(bank.current.loading).toBe(false));
    expect(bank.current.isBank).toBe(true);
    expect(bank.current.isCard).toBe(false);

    const { result: card } = renderHook(() => usePaymentStatus({ orderId: 'o1', paymentMethod: 'visa', controlNumber: 'https://pay.example.com/x' }));
    await waitFor(() => expect(card.current.loading).toBe(false));
    expect(card.current.isCard).toBe(true);
    expect(card.current.isBank).toBe(false);
  });

  it('auto-opens the hosted payment page once for card payments with a url', async () => {
    mockedApiGet.mockResolvedValueOnce({ data: { id: 'o1', status: 'pending' } });

    const initialProps = { orderId: 'o1', paymentMethod: 'visa', controlNumber: 'https://pay.example.com/x' };
    const { result, rerender } = renderHook(usePaymentStatus, { initialProps });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://pay.example.com/x'));

    rerender(initialProps);
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(1);
  });

  it('does not fetch or poll when there is no orderId', () => {
    const { result } = renderHook(() => usePaymentStatus({ orderId: '', paymentMethod: 'm-pesa' }));

    expect(result.current.loading).toBe(false);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });
});
