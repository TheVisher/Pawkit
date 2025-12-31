/**
 * Next.js navigation shim for Vite portal
 * Provides usePathname, useRouter, useSearchParams stubs
 */

import { useState, useCallback, useMemo, useSyncExternalStore } from 'react';

// Simple pathname store for portal navigation state
let currentPathname = '/library';
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentPathname;
}

export function setPortalPathname(pathname: string) {
  currentPathname = pathname;
  listeners.forEach((fn) => fn());
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useRouter() {
  const push = useCallback((href: string) => {
    setPortalPathname(href);
  }, []);

  const replace = useCallback((href: string) => {
    setPortalPathname(href);
  }, []);

  const back = useCallback(() => {
    // No history in portal
  }, []);

  const forward = useCallback(() => {
    // No history in portal
  }, []);

  const refresh = useCallback(() => {
    // No-op
  }, []);

  const prefetch = useCallback((href: string) => {
    // No-op
  }, []);

  return useMemo(
    () => ({
      push,
      replace,
      back,
      forward,
      refresh,
      prefetch,
    }),
    [push, replace, back, forward, refresh, prefetch]
  );
}

export function useSearchParams() {
  // Return empty search params
  return useMemo(() => new URLSearchParams(), []);
}

export function useParams() {
  // Extract params from pathname
  const pathname = usePathname();

  // Parse /pawkits/:slug pattern
  const pawkitMatch = pathname.match(/^\/pawkits\/([^/]+)/);
  if (pawkitMatch) {
    return { slug: pawkitMatch[1] };
  }

  return {};
}

// Re-export for compatibility
export { usePathname as redirect };
