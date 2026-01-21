'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDebugStore } from '@/lib/stores/debug-store';
import { DebugPanel } from './debug-panel';

const isDev = process.env.NODE_ENV === 'development';

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const togglePanel = useDebugStore((s) => s.togglePanel);
  const [mounted, setMounted] = useState(false);

  // Only mount after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isDev) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D (or Cmd+Shift+D on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        togglePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel]);

  return (
    <>
      {children}
      {isDev && mounted && createPortal(<DebugPanel />, document.body)}
    </>
  );
}
