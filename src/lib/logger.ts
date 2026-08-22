type LogLevel = 'info' | 'warn' | 'error';
type LogSink = (level: LogLevel, message: string, args: unknown[]) => void;

let sink: LogSink = (level, message, args) => {
  const consoleMethod = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
  consoleMethod(message, ...args);
};

/**
 * Plug in an external integration (e.g. Sentry) to receive all log calls,
 * in addition to or instead of the console. Call once, e.g. in app/_layout.tsx.
 */
export function setLogSink(next: LogSink) {
  sink = next;
}

export const logger = {
  info: (message: string, ...args: unknown[]) => sink('info', message, args),
  warn: (message: string, ...args: unknown[]) => sink('warn', message, args),
  error: (message: string, ...args: unknown[]) => sink('error', message, args),
};
