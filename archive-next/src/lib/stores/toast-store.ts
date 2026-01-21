/**
 * Toast Store
 * Manages toast notifications that display in the omnibar
 * Features elastic "pop" animation when new toasts arrive while one is showing
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms, default 4000
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

export interface ToastInput {
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  // Active toast (shows in omnibar)
  activeToast: Toast | null;

  // Ejected toasts (stacked below omnibar)
  ejectedToasts: Toast[];

  // Track if we're in the middle of an ejection animation
  isEjecting: boolean;

  // Actions
  toast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  dismissActiveToast: () => void;
  clearAll: () => void;
  setIsEjecting: (value: boolean) => void;
}

// Generate unique IDs
let toastIdCounter = 0;
const generateId = () => `toast-${++toastIdCounter}-${Date.now()}`;

export const useToastStore = create<ToastStore>((set, get) => ({
  activeToast: null,
  ejectedToasts: [],
  isEjecting: false,

  toast: (toastData) => {
    const id = generateId();
    const newToast: Toast = {
      id,
      type: toastData.type,
      message: toastData.message,
      duration: toastData.duration ?? 4000,
      action: toastData.action,
      createdAt: Date.now(),
    };

    const { activeToast } = get();

    if (activeToast) {
      // Eject current toast to stack, show new one
      set((state) => ({
        isEjecting: true,
        ejectedToasts: [activeToast, ...state.ejectedToasts].slice(0, 5), // Max 5 ejected
        activeToast: newToast,
      }));

      // Reset ejecting state after animation
      setTimeout(() => {
        set({ isEjecting: false });
      }, 300);
    } else {
      // No active toast, just show this one
      set({ activeToast: newToast });
    }

    // Auto-dismiss after duration
    setTimeout(() => {
      const { activeToast: currentActive } = get();
      if (currentActive?.id === id) {
        set({ activeToast: null });
      } else {
        // It was ejected, remove from ejected list
        set((state) => ({
          ejectedToasts: state.ejectedToasts.filter((t) => t.id !== id),
        }));
      }
    }, newToast.duration);

    return id;
  },

  dismissToast: (id) => {
    const { activeToast } = get();
    if (activeToast?.id === id) {
      set({ activeToast: null });
    } else {
      set((state) => ({
        ejectedToasts: state.ejectedToasts.filter((t) => t.id !== id),
      }));
    }
  },

  dismissActiveToast: () => {
    set({ activeToast: null });
  },

  clearAll: () => {
    set({ activeToast: null, ejectedToasts: [] });
  },

  setIsEjecting: (value) => {
    set({ isEjecting: value });
  },
}));

// =============================================================================
// HOOKS
// =============================================================================

export function useToast() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismissToast);
  const clearAll = useToastStore((state) => state.clearAll);

  return {
    toast,
    dismiss,
    clearAll,
    // Convenience methods
    success: (message: string, options?: Omit<ToastInput, 'type' | 'message'>) =>
      toast({ type: 'success', message, ...options }),
    error: (message: string, options?: Omit<ToastInput, 'type' | 'message'>) =>
      toast({ type: 'error', message, ...options }),
    info: (message: string, options?: Omit<ToastInput, 'type' | 'message'>) =>
      toast({ type: 'info', message, ...options }),
    warning: (message: string, options?: Omit<ToastInput, 'type' | 'message'>) =>
      toast({ type: 'warning', message, ...options }),
  };
}

export function useActiveToast() {
  return useToastStore((state) => state.activeToast);
}

export function useEjectedToasts() {
  return useToastStore((state) => state.ejectedToasts);
}

export function useIsEjecting() {
  return useToastStore((state) => state.isEjecting);
}
