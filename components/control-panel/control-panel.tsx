"use client";

import { ReactNode, useEffect, useState } from "react";
import { X, Settings } from "lucide-react";

export type ControlPanelMode = "floating" | "anchored";

export type ControlPanelProps = {
  open: boolean;
  onClose: () => void;
  mode?: ControlPanelMode;
  onModeChange?: (mode: ControlPanelMode) => void;
  children: ReactNode;
};

export function ControlPanel({ open, onClose, mode: controlledMode, onModeChange, children }: ControlPanelProps) {
  // Mode can be controlled or uncontrolled
  const [internalMode, setInternalMode] = useState<ControlPanelMode>("floating");
  const mode = controlledMode ?? internalMode;

  const handleModeToggle = () => {
    const newMode = mode === "floating" ? "anchored" : "floating";
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };

  // Close on escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Subtle backdrop - doesn't block clicks */}
      {mode === "floating" && (
        <div
          className="fixed inset-0 bg-black/10 z-40 pointer-events-none"
        />
      )}

      {/* Control Panel */}
      <div
        className={`
          fixed top-4 right-4 bottom-4 w-[400px] z-50
          bg-white/5 backdrop-blur-lg border border-white/10
          flex flex-col
          animate-slide-in-right
          ${mode === "floating" ? "rounded-2xl shadow-2xl" : "rounded-l-2xl"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Controls</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Toggle Button */}
            <button
              onClick={handleModeToggle}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors
                bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground border border-white/10"
              title={mode === "floating" ? "Anchor panel" : "Float panel"}
            >
              {mode === "floating" ? "Anchor" : "Float"}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {children}
        </div>
      </div>
    </>
  );
}

// Panel Section Component
export type PanelSectionProps = {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
};

export function PanelSection({ title, children, icon }: PanelSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

// Panel Button Component
export type PanelButtonProps = {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
};

export function PanelButton({ children, active, onClick, icon }: PanelButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
        ${active
          ? "bg-accent text-accent-foreground font-medium"
          : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
    </button>
  );
}

// Panel Toggle Component (for checkboxes)
export type PanelToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
};

export function PanelToggle({ label, checked, onChange, icon }: PanelToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
        ${checked
          ? "bg-accent/20 text-accent-foreground border border-accent/50"
          : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground border border-transparent"
        }
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{label}</span>
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
        ${checked ? "bg-accent border-accent" : "border-muted-foreground"}`}>
        {checked && (
          <svg className="w-3 h-3 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
