"use client";

import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 3000);

    return id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string) => showToast(message, "success"),
    [showToast]
  );

  const error = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast]
  );

  const info = useCallback(
    (message: string) => showToast(message, "info"),
    [showToast]
  );

  const warning = useCallback(
    (message: string) => showToast(message, "warning"),
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
  };
}
