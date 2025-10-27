import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

export const GlassModal = React.forwardRef<HTMLDivElement, GlassModalProps>(
  ({ open, onClose, children, className, maxWidth = "md" }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    // Close on escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && open) {
          onClose();
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    // Handle animations
    React.useEffect(() => {
      if (open) {
        setIsVisible(true);
      } else {
        const timer = setTimeout(() => setIsVisible(false), 200);
        return () => clearTimeout(timer);
      }
    }, [open]);

    if (!isVisible && !open) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-lg transition-all duration-200 pointer-events-auto",
              open ? "opacity-100 scale-100" : "opacity-0 scale-95",
              maxWidthClasses[maxWidth],
              className
            )}
          >
            {children}
          </div>
        </div>
      </>
    );
  }
);
GlassModal.displayName = "GlassModal";
