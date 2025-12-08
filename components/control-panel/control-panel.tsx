"use client";

import { ReactNode, useState } from "react";
import { X, Sun, Moon, SunMoon, Trash2, Sliders, ArrowUpRight, ArrowDownLeft, ChevronDown } from "lucide-react";
import { TrashPopover } from "@/components/trash/trash-popover";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileModal } from "@/components/modals/profile-modal";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { SyncStatus } from "@/components/sync/sync-status";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

export type ControlPanelMode = "floating" | "anchored";

export type ControlPanelProps = {
  open: boolean;
  onClose: () => void;
  mode?: ControlPanelMode;
  onModeChange?: (mode: ControlPanelMode) => void;
  children: ReactNode;
  embedded?: boolean; // Special mode: embedded inside content panel
  floatingOverContent?: boolean; // Special mode: floating over visible content (needs darker glass)
  username?: string;
  displayName?: string | null;
};

export function ControlPanel({ open, onClose, mode: controlledMode, onModeChange, children, embedded = false, floatingOverContent = false, username = "", displayName = null }: ControlPanelProps) {
  const router = useRouter();
  // Mode can be controlled or uncontrolled
  const [internalMode, setInternalMode] = useState<ControlPanelMode>("floating");
  const mode = controlledMode ?? internalMode;
  const [showProfile, setShowProfile] = useState(false);

  // Get display name from settings store (local-only)
  const storedDisplayName = useSettingsStore((state) => state.displayName);
  const effectiveDisplayName = storedDisplayName || displayName || username;

  // Theme toggle
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const handleThemeToggle = () => {
    // Cycle: dark -> light -> auto -> dark
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('auto');
    else setTheme('dark');
  };

  // Get sidebar visibility settings
  const showSyncStatusInSidebar = useSettingsStore((state) => state.showSyncStatusInSidebar);

  const handleModeToggle = () => {
    const newMode = mode === "floating" ? "anchored" : "floating";
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };

  // Note: Escape key handling is done globally in layout.tsx to ensure
  // proper priority (modals close before panels)

  // Mobile detection - hide right panel on mobile (modal is full-screen)
  const isMobile = useIsMobile();

  // Don't render on mobile or when closed
  if (!open || isMobile) return null;

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
      {/* Control Panel */}
      <div
        data-panel="right"
        className={`
          ${positionClasses}
          flex flex-col
          animate-slide-in-right
          ${styleClasses}
        `}
        style={{
          // Use consistent background - same surface level as other panels
          background: 'var(--bg-surface-1)',
          boxShadow: embedded
            ? "var(--shadow-2)"
            : mode === "floating"
              ? "var(--shadow-4)"
              : "var(--shadow-2)",
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
          borderLeftColor: 'var(--border-highlight-left)',
          transition: "top 0.3s ease-out, right 0.3s ease-out, bottom 0.3s ease-out, margin 0.3s ease-out, border-radius 0.3s ease-out, box-shadow 0.3s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Icon-only controls */}
        <TooltipProvider>
          <div className="flex items-center justify-evenly p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
              <TooltipContent side="bottom" className="z-[200]">Close</TooltipContent>
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
              <TooltipContent side="bottom" className="z-[200]">{mode === "floating" ? "Anchor" : "Float"}</TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleThemeToggle}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label={`Theme: ${theme} (click to change)`}
                >
                  {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <SunMoon size={18} />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[200]">
                {theme === 'dark' ? 'Dark mode' : theme === 'light' ? 'Light mode' : 'Auto (system)'}
              </TooltipContent>
            </Tooltip>

            {/* Trash */}
            <TrashPopover>
              <button
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Trash"
              >
                <Trash2 size={18} />
              </button>
            </TrashPopover>

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/settings')}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Settings"
                >
                  <Sliders size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[200]">Settings</TooltipContent>
            </Tooltip>

            {/* Profile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowProfile(true)}
                  className="rounded-full hover:ring-2 hover:ring-white/20 transition-all"
                  aria-label="Profile"
                >
                  <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-base">
                    {(effectiveDisplayName || "U").charAt(0).toUpperCase()}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[200]">
                <div className="text-center">
                  <div className="font-semibold">{effectiveDisplayName || "User"}</div>
                  <div className="text-xs text-muted-foreground">View profile</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            maskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)"
          }}
        >
          {children}
        </div>

        {/* Sync Status Footer - Fixed at bottom - Conditional based on settings */}
        {showSyncStatusInSidebar && <SyncStatus />}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        username={username}
        email={username}
      />
    </>
  );
}

// Panel Section Component

export type PanelSectionProps = {
  id: string; // Unique identifier for persisting collapse state
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode; // Optional action button (like +)
  onClick?: () => void; // Optional click handler for title (e.g., navigation)
  active?: boolean; // Whether this section is currently active/selected
  glowSide?: 'left' | 'right'; // Which side the accent glow appears on when active (default: 'right' for left sidebar)
};

export function PanelSection({ id, title, children, icon, action, onClick, active, glowSide = 'right' }: PanelSectionProps) {
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  const isCollapsed = collapsedSections[id] || false;

  const handleTitleClick = () => {
    if (onClick) {
      onClick();
    } else {
      toggleSection(id);
    }
  };

  // Glow on right for left sidebar (points toward center), left for right sidebar
  const glowBoxShadow = glowSide === 'right'
    ? 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)'
    : 'inset 3px 0 0 var(--ds-accent), var(--shadow-1)';

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)'
      }}
    >
      <div className="w-full flex items-center gap-2 group">
        <button
          onClick={handleTitleClick}
          className="flex items-center gap-3 transition-all flex-1 px-3 py-2 rounded-lg text-sm"
          style={active ? {
            background: 'var(--bg-surface-3)',
            boxShadow: glowBoxShadow,
            border: '1px solid var(--border-subtle)',
            borderTopColor: 'var(--border-highlight-top)',
            borderLeftColor: 'var(--border-highlight-left)',
          } : undefined}
        >
          {icon}
          <span
            className="font-semibold uppercase tracking-wide transition-all"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '0.5px',
              fontSize: '0.8125rem',
            }}
          >
            {title}
          </span>
        </button>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSection(id);
          }}
          className="p-1 rounded transition-colors flex-shrink-0"
          style={{ color: 'var(--ds-accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isCollapsed ? "-rotate-90" : ""
            }`}
          />
        </button>
      </div>
      <div
        className={`space-y-2 transition-all duration-200 overflow-hidden ${
          isCollapsed ? "max-h-0 opacity-0 mt-0" : "max-h-[2000px] opacity-100 mt-3"
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
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
      style={{
        background: active ? 'var(--bg-surface-3)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-1)' : 'none',
        border: active ? '1px solid var(--border-subtle)' : '1px solid transparent',
        borderLeft: active ? '3px solid var(--ds-accent)' : '3px solid transparent',
        borderTopColor: active ? 'var(--border-highlight-top)' : 'transparent',
        fontWeight: active ? 500 : 400
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-surface-3)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
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
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
      style={{
        background: checked ? 'var(--ds-accent-subtle)' : 'transparent',
        color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: checked ? '1px solid var(--ds-accent-muted)' : '1px solid transparent'
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'var(--bg-surface-3)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{label}</span>
      <div
        className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
        style={{
          background: checked ? 'var(--ds-accent)' : 'transparent',
          borderColor: checked ? 'var(--ds-accent)' : 'var(--text-muted)'
        }}
      >
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
