import { logger, setLogSink, defaultLogSink } from '@/src/lib/logger';

describe('logger', () => {
  const originalDev = (global as any).__DEV__;

  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).__DEV__ = originalDev;
    // Always restore the real default sink so mutations in one test (e.g.
    // installing a custom sink) can't leak into unrelated tests.
    setLogSink(defaultLogSink);
  });

  it('forwards info/warn/error to the matching console method with all extra args', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.info('info message', { a: 1 }, 'extra');
    logger.warn('warn message', 42);
    logger.error('error message');

    expect(logSpy).toHaveBeenCalledWith('info message', { a: 1 }, 'extra');
    expect(warnSpy).toHaveBeenCalledWith('warn message', 42);
    expect(errorSpy).toHaveBeenCalledWith('error message');
  });

  it('routes through a custom sink when one is set via setLogSink', () => {
    const sink = jest.fn();
    setLogSink(sink);

    logger.error('boom', { code: 500 });

    expect(sink).toHaveBeenCalledWith('error', 'boom', [{ code: 500 }]);
  });

  it('suppresses info logs through the default sink when __DEV__ is false', () => {
    (global as any).__DEV__ = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.info('should be suppressed');
    logger.warn('should still log');
    logger.error('should still log');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('should still log');
    expect(errorSpy).toHaveBeenCalledWith('should still log');
  });

  it('still logs info through the default sink when __DEV__ is true', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('dev info message');

    expect(logSpy).toHaveBeenCalledWith('dev info message');
  });

  it('still delivers info calls to a custom sink even when __DEV__ is false, since filtering is a default-sink concern', () => {
    (global as any).__DEV__ = false;
    const sink = jest.fn();
    setLogSink(sink);

    logger.info('info for custom sink', { a: 1 });

    expect(sink).toHaveBeenCalledWith('info', 'info for custom sink', [{ a: 1 }]);
  });
});
