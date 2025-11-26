"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
  onClose: () => void;
};

export function Toast({ message, type = "info", duration, action, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Don't auto-dismiss loading toasts unless duration is explicitly set
    // Toasts with actions get longer default duration
    const defaultDuration = action ? 8000 : 3000;
    const shouldAutoDismiss = type === "loading" ? duration !== undefined : true;
    const dismissDuration = duration ?? defaultDuration;

    if (shouldAutoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, dismissDuration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type, action]);

  const handleActionClick = () => {
    if (action) {
      action.onClick();
      // Dismiss toast after action is clicked
      setIsVisible(false);
      setTimeout(onClose, 300);
    }
  };

  const getToastStyles = () => {
    // All toasts use glass morphism base with colored accents
    const glassBase = "backdrop-blur-lg bg-gray-900/90 border";

    switch (type) {
      case "success":
        return `${glassBase} border-green-500/30`;
      case "error":
        return `${glassBase} border-red-500/30`;
      case "warning":
        return `${glassBase} border-yellow-500/30`;
      case "loading":
        return `${glassBase} border-purple-500/30`;
      case "info":
      default:
        return `${glassBase} border-white/10`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case "loading":
        return <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div
      className={`relative flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl pointer-events-auto transition-all duration-300 ${getToastStyles()} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {getIcon()}
      <p className="text-sm text-white font-medium flex-1">{message}</p>
      {action && (
        <button
          onClick={handleActionClick}
          className="px-3 py-1 text-xs font-medium rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-colors border border-purple-500/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

type ToastContainerProps = {
  toasts: Array<{ id: string; message: string; type?: ToastType; duration?: number; action?: ToastAction }>;
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          action={toast.action}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
