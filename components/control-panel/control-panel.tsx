"use client";

import { ReactNode, useEffect, useState } from "react";
import { X, HelpCircle, Trash2, BookOpen, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ControlPanelMode = "floating" | "anchored";

export type ControlPanelProps = {
  open: boolean;
  onClose: () => void;
  mode?: ControlPanelMode;
  onModeChange?: (mode: ControlPanelMode) => void;
  children: ReactNode;
  embedded?: boolean; // Special mode: embedded inside content panel
  username?: string;
  displayName?: string | null;
};

export function ControlPanel({ open, onClose, mode: controlledMode, onModeChange, children, embedded = false, username = "", displayName = null }: ControlPanelProps) {
  const router = useRouter();
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

  // When embedded, the panel is positioned within the content panel
  // Otherwise it's fixed to the viewport
  const positionClasses = embedded
    ? "fixed top-4 right-4 bottom-4 w-[325px] z-20"
    : `fixed top-0 right-0 bottom-0 w-[325px] z-[102] ${mode === "floating" ? "m-4" : ""}`;

  const styleClasses = embedded
    ? "rounded-r-2xl border-l border-white/20"
    : mode === "floating"
      ? "rounded-2xl shadow-2xl border border-white/10"
      : "border-l border-white/10";

  return (
    <>
      {/* Subtle backdrop - only in floating mode and not embedded */}
      {mode === "floating" && !embedded && (
        <div
          className="fixed inset-0 bg-black/10 z-40 pointer-events-none"
        />
      )}

      {/* Control Panel */}
      <div
        className={`
          ${positionClasses}
          bg-white/5 backdrop-blur-lg
          flex flex-col
          animate-slide-in-right
          ${styleClasses}
        `}
        style={{
          boxShadow: embedded
            ? "inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)"
            : mode === "floating"
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)"
              : "inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)",
          transition: "top 0.3s ease-out, right 0.3s ease-out, bottom 0.3s ease-out, margin 0.3s ease-out, border-radius 0.3s ease-out, box-shadow 0.3s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Icon-only controls */}
        <TooltipProvider>
          <div className="flex items-center justify-end gap-1 p-3 border-b border-white/10">
            {/* Close Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Close panel"
                >
                  <X size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>

            {/* Help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/help')}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Help"
                >
                  <HelpCircle size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Help</TooltipContent>
            </Tooltip>

            {/* Trash */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/trash')}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Trash"
                >
                  <Trash2 size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Trash</TooltipContent>
            </Tooltip>

            {/* Changelog */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/changelog')}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Changelog"
                >
                  <BookOpen size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Changelog</TooltipContent>
            </Tooltip>

            {/* Float/Anchor Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleModeToggle}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label={mode === "floating" ? "Anchor panel" : "Float panel"}
                >
                  {mode === "floating" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{mode === "floating" ? "Anchor" : "Float"}</TooltipContent>
            </Tooltip>

            {/* Profile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="ml-2 rounded-full hover:ring-2 hover:ring-white/20 transition-all"
                  aria-label="Profile"
                >
                  <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-base">
                    {(displayName || username || "U").charAt(0).toUpperCase()}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-center">
                  <div className="font-semibold">{displayName || username || "User"}</div>
                  <div className="text-xs text-muted-foreground">View profile</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)"
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// Panel Section Component
export type PanelSectionProps = {
  id: string; // Unique identifier for persisting collapse state
  title: string;
  children: ReactNode;
  icon?: ReactNode;
};

export function PanelSection({ id, title, children, icon }: PanelSectionProps) {
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  const isCollapsed = collapsedSections[id] || false;

  return (
    <div className="space-y-3">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <ChevronDown
          className={`h-4 w-4 text-accent transition-transform duration-200 ${
            isCollapsed ? "-rotate-90" : ""
          }`}
        />
        {icon}
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h3>
      </button>
      <div
        className={`space-y-2 transition-all duration-200 overflow-hidden ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
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
