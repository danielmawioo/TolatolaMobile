import { logger } from '@/src/lib/logger';

export type ErrorTrackingUser = { id: string; email?: string } | null;

interface ErrorTrackingProvider {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  setUser(user: ErrorTrackingUser): void;
}

/**
 * Default provider: routes through the existing logger. Swap this out in
 * app/_layout.tsx via `setErrorTrackingProvider(...)` to wire a real service
 * (Sentry, Bugsnag, etc.) without touching any of the call sites below.
 */
const consoleProvider: ErrorTrackingProvider = {
  captureException(error, context) {
    logger.error('[error-tracking] captureException', error, context);
  },
  captureMessage(message, level = 'info') {
    logger[level === 'warning' ? 'warn' : level](`[error-tracking] ${message}`);
  },
  setUser(user) {
    logger.info('[error-tracking] setUser', user);
  },
};

let provider: ErrorTrackingProvider = consoleProvider;

/**
 * Plug in a real error-tracking SDK. Call once at startup, e.g.:
 *
 *   setErrorTrackingProvider({
 *     captureException: (e, ctx) => Sentry.captureException(e, { extra: ctx }),
 *     captureMessage: (m, level) => Sentry.captureMessage(m, level),
 *     setUser: (u) => Sentry.setUser(u),
 *   });
 */
export function setErrorTrackingProvider(next: ErrorTrackingProvider) {
  provider = next;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  provider.captureException(error, context);
}

export function captureMessage(message: string, level?: 'info' | 'warning' | 'error') {
  provider.captureMessage(message, level);
}

export function setErrorTrackingUser(user: ErrorTrackingUser) {
  provider.setUser(user);
}
