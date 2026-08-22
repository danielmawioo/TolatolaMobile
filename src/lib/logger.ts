type LogLevel = 'info' | 'warn' | 'error';
type LogSink = (level: LogLevel, message: string, meta?: unknown) => void;

let sink: LogSink = (level, message, meta) => {
  const consoleMethod = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
  if (meta !== undefined) {
    consoleMethod(message, meta);
  } else {
    consoleMethod(message);
  }
};

/**
 * Plug in an external integration (e.g. Sentry) to receive all log calls,
 * in addition to or instead of the console. Call once, e.g. in app/_layout.tsx.
 */
export function setLogSink(next: LogSink) {
  sink = next;
}

export const logger = {
  info: (message: string, meta?: unknown) => sink('info', message, meta),
  warn: (message: string, meta?: unknown) => sink('warn', message, meta),
  error: (message: string, meta?: unknown) => sink('error', message, meta),
};
