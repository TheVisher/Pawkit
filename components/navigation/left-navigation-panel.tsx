"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Library, FileText, Calendar, Tag, Settings, BookOpen, Clock, Trash2, HelpCircle, X } from "lucide-react";
import { PanelSection } from "@/components/control-panel/control-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

type NavItem = {
  id: string;
  label: string;
  icon: any;
  href: string;
};

const navigationItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/home" },
  { id: "library", label: "Library", icon: Library, href: "/library" },
  { id: "notes", label: "Notes", icon: FileText, href: "/notes" },
  { id: "calendar", label: "Calendar", icon: Calendar, href: "/calendar" },
  { id: "tags", label: "Tags", icon: Tag, href: "/tags" },
];

const bottomItems: NavItem[] = [
  { id: "changelog", label: "Changelog", icon: BookOpen, href: "/changelog" },
  { id: "trash", label: "Trash", icon: Trash2, href: "/trash" },
  { id: "help", label: "Help", icon: HelpCircle, href: "/help" },
];

export type LeftPanelMode = "floating" | "anchored";

type LeftNavigationPanelProps = {
  open: boolean;
  onClose: () => void;
  mode?: LeftPanelMode;
  onModeChange?: (mode: LeftPanelMode) => void;
};

export function LeftNavigationPanel({ open, onClose, mode = "floating", onModeChange }: LeftNavigationPanelProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleModeToggle = () => {
    const newMode = mode === "floating" ? "anchored" : "floating";
    onModeChange?.(newMode);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  if (!open) return null;

  return (
    <>
      {/* Subtle backdrop - only in floating mode */}
      {mode === "floating" && (
        <div className="fixed inset-0 bg-black/10 z-40 pointer-events-none" />
      )}

      {/* Left Navigation Panel */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-[400px] z-[102]
          bg-white/5 backdrop-blur-lg
          flex flex-col
          animate-slide-in-left
          ${mode === "floating"
            ? "m-4 rounded-2xl shadow-2xl border border-white/10"
            : "border-r border-white/10"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
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
          {/* Navigation Section */}
          <PanelSection id="left-navigation" title="Navigation" icon={<Home className="h-4 w-4 text-accent" />}>
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.href)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                      ${isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </PanelSection>

          {/* Daily Notes Section */}
          <PanelSection id="left-daily-notes" title="Daily Notes" icon={<FileText className="h-4 w-4 text-accent" />}>
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate("/notes#daily-" + new Date().toISOString().split('T')[0])}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <Calendar size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Today's Note</span>
              </button>
              <p className="text-xs text-muted-foreground px-3">
                Quick access to daily notes coming soon...
              </p>
            </div>
          </PanelSection>

          {/* Recently Viewed Section */}
          <PanelSection id="left-recently-viewed" title="Recently Viewed" icon={<Clock className="h-4 w-4 text-accent" />}>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-3">
                Recent cards and notes will appear here...
              </p>
            </div>
          </PanelSection>

          {/* Spacer to push bottom items down */}
          <div className="flex-1" />

          {/* Bottom Section */}
          <PanelSection id="left-bottom" title="More" icon={<HelpCircle className="h-4 w-4 text-accent" />}>
            <div className="space-y-2">
              {bottomItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.href)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                      ${isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </PanelSection>
        </div>
      </div>
    </>
  );
}
