type LogLevel = 'info' | 'warn' | 'error';
type LogSink = (level: LogLevel, message: string, args: unknown[]) => void;

export type StructuredLogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: unknown[];
};

let structuredLogObserver: ((entry: StructuredLogEntry) => void) | null = null;

/** Receive every structured record the default sink actually emits (warn/error in production, all levels in dev). */
export function setStructuredLogObserver(next: ((entry: StructuredLogEntry) => void) | null) {
  structuredLogObserver = next;
}

const LOG_LEVEL_RANK: Record<LogLevel, number> = { info: 0, warn: 1, error: 2 };

/**
 * The minimum level the *default* console sink will print. In production
 * (__DEV__ falsy) we drop `info` noise but always keep warn/error; in dev
 * everything prints. This only governs the default sink — a custom sink
 * installed via setLogSink always receives every call regardless of level.
 */
function defaultSinkMinLevel(): LogLevel {
  return typeof __DEV__ !== 'undefined' && !__DEV__ ? 'warn' : 'info';
}

/**
 * The built-in console sink, exported so callers (and tests) can restore it
 * after installing a custom sink via setLogSink.
 */
export const defaultLogSink: LogSink = (level, message, args) => {
  if (LOG_LEVEL_RANK[level] < LOG_LEVEL_RANK[defaultSinkMinLevel()]) return;
  const consoleMethod = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
  const logEntry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: args.length ? args : undefined,
  };
  structuredLogObserver?.(logEntry);
  consoleMethod(logEntry);
};

let sink: LogSink = defaultLogSink;

/**
 * Plug in an external integration (e.g. Sentry) to receive all log calls,
 * in addition to or instead of the console. Call once, e.g. in app/_layout.tsx.
 *
 * Unlike the default console sink, a custom sink receives every call
 * regardless of level — env-aware filtering is a property of the default
 * sink only, so callers that want to filter can do so themselves.
 */
export function setLogSink(next: LogSink) {
  sink = next;
}

/** Prevents consoleProvider.captureException → logger.error → captureException loops. */
let forwardingErrorToTracking = false;

function forwardErrorToTracking(message: string, args: unknown[]) {
  if (forwardingErrorToTracking) return;
  forwardingErrorToTracking = true;
  try {
    // Lazy require avoids a static cycle with errorTracking → logger.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { captureException } = require('@/src/lib/errorTracking') as typeof import('@/src/lib/errorTracking');
    const err = args.find((a): a is Error => a instanceof Error) ?? new Error(message);
    const extra = args.filter((a) => !(a instanceof Error));
    captureException(err, {
      logMessage: message,
      ...(extra.length ? { context: extra } : {}),
    });
  } catch {
    // Tracking must never break the caller.
  } finally {
    forwardingErrorToTracking = false;
  }
}

export const logger = {
  info: (message: string, ...args: unknown[]) => sink('info', message, args),
  warn: (message: string, ...args: unknown[]) => sink('warn', message, args),
  error: (message: string, ...args: unknown[]) => {
    sink('error', message, args);
    forwardErrorToTracking(message, args);
  },
};
