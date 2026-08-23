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

  it('forwards info/warn/error to the matching console method as a structured log entry', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.info('info message', { a: 1 }, 'extra');
    logger.warn('warn message', 42);
    logger.error('error message');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const infoEntry = logSpy.mock.calls[0][0] as any;
    expect(infoEntry.level).toBe('info');
    expect(infoEntry.message).toBe('info message');
    expect(infoEntry.context).toEqual([{ a: 1 }, 'extra']);
    expect(typeof infoEntry.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(infoEntry.timestamp))).toBe(false);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warnEntry = warnSpy.mock.calls[0][0] as any;
    expect(warnEntry.level).toBe('warn');
    expect(warnEntry.message).toBe('warn message');
    expect(warnEntry.context).toEqual([42]);
    expect(typeof warnEntry.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(warnEntry.timestamp))).toBe(false);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const errorEntry = errorSpy.mock.calls[0][0] as any;
    expect(errorEntry.level).toBe('error');
    expect(errorEntry.message).toBe('error message');
    expect(errorEntry.context).toBeUndefined();
    expect(typeof errorEntry.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(errorEntry.timestamp))).toBe(false);
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
    expect(warnSpy.mock.calls[0][0]).toMatchObject({ level: 'warn', message: 'should still log' });
    expect(errorSpy.mock.calls[0][0]).toMatchObject({ level: 'error', message: 'should still log' });
  });

  it('still logs info through the default sink when __DEV__ is true', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('dev info message');

    expect(logSpy.mock.calls[0][0]).toMatchObject({ level: 'info', message: 'dev info message' });
  });

  it('still delivers info calls to a custom sink even when __DEV__ is false, since filtering is a default-sink concern', () => {
    (global as any).__DEV__ = false;
    const sink = jest.fn();
    setLogSink(sink);

    logger.info('info for custom sink', { a: 1 });

    expect(sink).toHaveBeenCalledWith('info', 'info for custom sink', [{ a: 1 }]);
  });
});
