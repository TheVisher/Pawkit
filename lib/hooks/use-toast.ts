"use client";

import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after specified duration (default 3 seconds)
    // Loading toasts don't auto-dismiss unless duration is specified
    const dismissDuration = duration ?? (type === "loading" ? undefined : 3000);

    if (dismissDuration !== undefined) {
      setTimeout(() => {
        dismissToast(id);
      }, dismissDuration);
    }

    return id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, "success", duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, "error", duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, "info", duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, "warning", duration),
    [showToast]
  );

  const loading = useCallback(
    (message: string, duration?: number) => showToast(message, "loading", duration),
    [showToast]
  );

  return {
    toasts,
    showToast,
    dismissToast,
    success,
    error,
    info,
    warning,
    loading,
  };
}
