"use client";

import { useEffect, useState } from "react";

export type ToastProps = {
  message: string;
  duration?: number;
  onClose: () => void;
};

export function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 shadow-xl transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <p className="text-sm text-gray-100">{message}</p>
    </div>
  );
}

type ToastContainerProps = {
  toasts: Array<{ id: string; message: string }>;
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} onClose={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}
