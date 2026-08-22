export type AppErrorKind = 'network' | 'validation' | 'auth' | 'server' | 'unknown';

/**
 * Typed error thrown by src/services/api.ts. Extends Error so every existing
 * `catch (err: any) { ... err.message ... }` call site keeps working unchanged —
 * `kind` and `status` are additive, not breaking.
 */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;

  constructor(message: string, kind: AppErrorKind = 'unknown', status?: number) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.status = status;
  }
}

/** Maps an HTTP status code to an AppError kind. */
export function classifyStatus(status: number): AppErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}
