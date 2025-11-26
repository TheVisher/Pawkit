"use client";

import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

let toastCounter = 0;

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => string;
  dismissToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  loading: (message: string, duration?: number) => string;
  withAction: (message: string, action: ToastAction, type?: ToastType, duration?: number) => string;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  showToast: (message: string, type: ToastType = "info", duration?: number, action?: ToastAction) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast: Toast = { id, message, type, duration, action };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after specified duration (default 3 seconds)
    // Loading toasts don't auto-dismiss unless duration is specified
    // Toasts with actions get longer default duration (8 seconds)
    const defaultDuration = action ? 8000 : (type === "loading" ? undefined : 3000);
    const dismissDuration = duration ?? defaultDuration;

    if (dismissDuration !== undefined) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, dismissDuration);
    }

    return id;
  },

  dismissToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  success: (message: string, duration?: number) => {
    return get().showToast(message, "success", duration);
  },

  error: (message: string, duration?: number) => {
    return get().showToast(message, "error", duration);
  },

  info: (message: string, duration?: number) => {
    return get().showToast(message, "info", duration);
  },

  warning: (message: string, duration?: number) => {
    return get().showToast(message, "warning", duration);
  },

  loading: (message: string, duration?: number) => {
    return get().showToast(message, "loading", duration);
  },

  withAction: (message: string, action: ToastAction, type: ToastType = "info", duration?: number) => {
    return get().showToast(message, type, duration, action);
  },
}));
