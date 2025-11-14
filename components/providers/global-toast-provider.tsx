"use client";

import { useToastStore } from "@/lib/stores/toast-store";
import { ToastContainer } from "@/components/ui/toast";

/**
 * Global Toast Provider - renders toasts across the entire app
 * Add this to your root layout to enable toasts globally
 *
 * Usage in any component:
 * ```
 * import { useToastStore } from "@/lib/stores/toast-store";
 *
 * function MyComponent() {
 *   const toast = useToastStore();
 *
 *   const handleAction = () => {
 *     toast.success("Action completed!");
 *     toast.error("Something went wrong");
 *     toast.loading("Processing...");
 *   };
 * }
 * ```
 */
export function GlobalToastProvider() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}
