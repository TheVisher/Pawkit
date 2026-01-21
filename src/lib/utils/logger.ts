/**
 * Development-only logger utility
 * Logs are silenced in production builds
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

function createLogger(prefix?: string): Logger {
  const format = (message: string) => (prefix ? `[${prefix}] ${message}` : message);

  return {
    debug: (message, ...args) => {
      if (isDev) console.debug(format(message), ...args);
    },
    info: (message, ...args) => {
      if (isDev) console.info(format(message), ...args);
    },
    warn: (message, ...args) => {
      if (isDev) console.warn(format(message), ...args);
    },
    error: (message, ...args) => {
      // Always log errors, even in production
      console.error(format(message), ...args);
    },
  };
}

// Default logger without prefix
export const logger = createLogger();

// Create a prefixed logger for specific modules
export function createModuleLogger(moduleName: string): Logger {
  return createLogger(moduleName);
}
