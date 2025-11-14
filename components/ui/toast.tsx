"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
};

export function Toast({ message, type = "info", duration, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Don't auto-dismiss loading toasts unless duration is explicitly set
    const shouldAutoDismiss = type === "loading" ? duration !== undefined : true;
    const dismissDuration = duration ?? 3000;

    if (shouldAutoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, dismissDuration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-900/90 border-green-600";
      case "error":
        return "bg-red-900/90 border-red-600";
      case "warning":
        return "bg-yellow-900/90 border-yellow-600";
      case "loading":
        return "bg-purple-900/90 border-purple-600";
      case "info":
      default:
        return "bg-blue-900/90 border-blue-600";
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
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm transition-all duration-300 ${getToastStyles()} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {getIcon()}
      <p className="text-sm text-white font-medium">{message}</p>
    </div>
  );
}

type ToastContainerProps = {
  toasts: Array<{ id: string; message: string; type?: ToastType; duration?: number }>;
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
