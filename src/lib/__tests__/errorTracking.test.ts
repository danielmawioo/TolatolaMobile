import * as Sentry from '@sentry/react-native';
import { captureException, captureMessage, setErrorTrackingUser, setErrorTrackingProvider, initErrorTracking } from '@/src/lib/errorTracking';

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

  it('is a no-op for Sentry when the DSN env var is unset', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    (Sentry.init as jest.Mock).mockClear();
    (Sentry.captureException as jest.Mock).mockClear();

    initErrorTracking();
    expect(() => captureException(new Error('boom'), { screen: 'Checkout' })).not.toThrow();

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('initializes Sentry and forwards captureException when a DSN is set', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0';
    (Sentry.init as jest.Mock).mockClear();
    (Sentry.captureException as jest.Mock).mockClear();

    initErrorTracking();
    const err = new Error('boom');
    captureException(err, { screen: 'Cart' });

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://public@o0.ingest.sentry.io/0',
      enabled: true,
    }));
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: { screen: 'Cart' } });

    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    initErrorTracking();
  });
});
