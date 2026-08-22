import { AppError, classifyStatus } from '@/src/lib/errors';

describe('AppError', () => {
  it('behaves as a normal Error (message, instanceof, stack) plus kind/status', () => {
    const err = new AppError('Something broke', 'server', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Something broke');
    expect(err.kind).toBe('server');
    expect(err.status).toBe(500);
    expect(err.name).toBe('AppError');
  });

  it('defaults kind to "unknown" and status to undefined', () => {
    const err = new AppError('Oops');
    expect(err.kind).toBe('unknown');
    expect(err.status).toBeUndefined();
  });
});

describe('classifyStatus', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [400, 'validation'],
    [422, 'validation'],
    [500, 'server'],
    [503, 'server'],
    [404, 'unknown'],
    [200, 'unknown'],
  ])('maps status %i to kind "%s"', (status, kind) => {
    expect(classifyStatus(status)).toBe(kind);
  });
});
