/**
 * Development-only logger utility
 * Automatically disables console logs in production builds
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('[DEBUG]', ...args);
    }
  }
};

// Performance monitoring for development
export const perfLogger = {
  start: (label: string) => {
    if (isDevelopment) {
      performance.mark(`${label}-start`);
    }
  },
  
  end: (label: string) => {
    if (isDevelopment) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label)[0];
      if (measure && measure.duration > 100) { // Only log if > 100ms
        console.warn(`[PERF] ${label}: ${measure.duration.toFixed(2)}ms`);
      }
    }
  }
};
