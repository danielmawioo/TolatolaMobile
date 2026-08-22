import { captureException, captureMessage, setErrorTrackingUser, setErrorTrackingProvider } from '@/src/lib/errorTracking';

describe('errorTracking', () => {
  afterEach(() => {
    // restore the default console-backed provider between tests
    setErrorTrackingProvider({
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      setUser: jest.fn(),
    });
  });

  it('routes through the console-backed default provider without throwing', () => {
    expect(() => captureException(new Error('boom'), { screen: 'Checkout' })).not.toThrow();
    expect(() => captureMessage('hello')).not.toThrow();
    expect(() => setErrorTrackingUser({ id: 'u1', email: 'a@b.com' })).not.toThrow();
    expect(() => setErrorTrackingUser(null)).not.toThrow();
  });

  it('forwards calls to a custom provider once one is set', () => {
    const provider = {
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      setUser: jest.fn(),
    };
    setErrorTrackingProvider(provider);

    const err = new Error('boom');
    captureException(err, { screen: 'Cart' });
    captureMessage('warned', 'warning');
    setErrorTrackingUser({ id: 'u2' });

    expect(provider.captureException).toHaveBeenCalledWith(err, { screen: 'Cart' });
    expect(provider.captureMessage).toHaveBeenCalledWith('warned', 'warning');
    expect(provider.setUser).toHaveBeenCalledWith({ id: 'u2' });
  });
});
