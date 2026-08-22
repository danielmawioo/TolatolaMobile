import { logger, setLogSink } from '@/src/lib/logger';

describe('logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
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

    // restore the default console sink so other tests aren't affected
    setLogSink((level, message, args) => {
      const method = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
      method(message, ...args);
    });
  });
});
