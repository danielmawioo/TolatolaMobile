import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { setStructuredLogObserver, type StructuredLogEntry } from '@/src/lib/logger';

export type ErrorTrackingUser = { id: string; email?: string } | null;

interface ErrorTrackingProvider {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  setUser(user: ErrorTrackingUser): void;
}

/**
 * Default provider: structured logs only. Sentry is installed by
 * `initErrorTracking()` when EXPO_PUBLIC_SENTRY_DSN (or extra.SENTRY_DSN) is set.
 */
/**
 * Default provider: console only. Uses console.* (not logger) so that
 * logger.error → captureException cannot recurse through this provider.
 */
const consoleProvider: ErrorTrackingProvider = {
  captureException(error, context) {
    console.error('[error-tracking] captureException', error, context);
  },
  captureMessage(message, level = 'info') {
    const method = level === 'warning' ? console.warn : level === 'error' ? console.error : console.log;
    method(`[error-tracking] ${message}`);
  },
  setUser(user) {
    console.log('[error-tracking] setUser', user);
  },
};

const sentryProvider: ErrorTrackingProvider = {
  captureException(error, context) {
    Sentry.captureException(error, { extra: context });
  },
  captureMessage(message, level = 'info') {
    Sentry.captureMessage(message, level);
  },
  setUser(user) {
    Sentry.setUser(user);
  },
};

let provider: ErrorTrackingProvider = consoleProvider;

/** Plug in a provider. Tests and `initErrorTracking` both use this. */
export function setErrorTrackingProvider(next: ErrorTrackingProvider) {
  provider = next;
}

export function resolveSentryDsn(): string {
  const extra = Constants.expoConfig?.extra as { SENTRY_DSN?: string } | undefined;
  return extra?.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || '';
}

function forwardStructuredLog(entry: StructuredLogEntry) {
  const attributes = entry.context ? { context: entry.context } : undefined;
  Sentry.addBreadcrumb({
    category: 'log',
    level: entry.level === 'warn' ? 'warning' : entry.level,
    message: entry.message,
    data: attributes,
  });
  const sentryLogger = Sentry.logger;
  if (entry.level === 'error') sentryLogger.error(entry.message, attributes);
  else if (entry.level === 'warn') sentryLogger.warn(entry.message, attributes);
  else sentryLogger.info(entry.message, attributes);
}

/**
 * Initialize Sentry when a DSN is configured. With no DSN this is a no-op:
 * captureException keeps the local logger and never calls Sentry.
 */
export function initErrorTracking() {
  const dsn = resolveSentryDsn();
  if (!dsn) {
    provider = consoleProvider;
    setStructuredLogObserver(null);
    return;
  }

  Sentry.init({
    dsn,
    enabled: true,
    enableLogs: true,
    tracesSampleRate: 0.2,
  });
  provider = sentryProvider;
  setStructuredLogObserver(forwardStructuredLog);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  // No DSN: console provider only. Sentry.init is never called, so this does not
  // leave the device. With a DSN, initErrorTracking has swapped in the Sentry provider.
  provider.captureException(error, context);
}

export function captureMessage(message: string, level?: 'info' | 'warning' | 'error') {
  provider.captureMessage(message, level);
}

export function setErrorTrackingUser(user: ErrorTrackingUser) {
  provider.setUser(user);
}
