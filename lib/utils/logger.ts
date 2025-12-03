/**
 * Centralized logger utility
 * - debug: Only logs in development (silenced in production)
 * - info: Always logs (for important operational info)
 * - warn: Always logs warnings
 * - error: Always logs errors
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
