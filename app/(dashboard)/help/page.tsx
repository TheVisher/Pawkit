"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import {
  HelpCircle,
  Command,
  Keyboard,
  FileText,
  Compass,
  Bookmark,
  Star,
  Zap,
  Calendar,
  Search,
  FolderOpen,
  Tags,
  Clock,
  Link2,
  Sparkles,
  MousePointer,
  Layers,
  Cloud,
  Shield,
  Palette
} from "lucide-react";

const hotkeyGroups = [
  {
    title: "Global Navigation",
    icon: Compass,
    items: [
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["⌘", "N"], description: "Create new note" },
      { keys: ["⌘", "P"], description: "Save a new card" },
      { keys: ["⌘", "T"], description: "Jump to today's daily note" },
      { keys: ["G", "H"], description: "Go to Home" },
      { keys: ["G", "L"], description: "Go to Library" },
      { keys: ["G", "C"], description: "Open Calendar" },
      { keys: ["G", "N"], description: "Open Notes" },
    ],
  },
  {
    title: "Within Views",
    icon: Search,
    items: [
      { keys: ["/"], description: "Focus global search" },
      { keys: ["⌘", "Shift", "D"], description: "Open today's daily note" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close open dialogs" },
    ],
  },
  {
    title: "Markdown Editor",
    icon: FileText,
    items: [
      { keys: ["⌘", "B"], description: "Bold" },
      { keys: ["⌘", "I"], description: "Italic" },
      { keys: ["⌘", "K"], description: "Insert wiki-link" },
      { keys: ["⌘", "E"], description: "Inline code" },
      { keys: ["⌘", "Shift", "T"], description: "Toggle template picker" },
      { keys: ["⌘", "/"], description: "Toggle preview" },
    ],
  },
];

const pawkitGuides = [
  {
    icon: Bookmark,
    title: "Save anything instantly",
    description: "Hit ⌘+P from anywhere to capture a link. Cards appear in Home and Library automatically.",
  },
  {
    icon: FolderOpen,
    title: "Organize with Pawkits",
    description: "Drag cards into themed Pawkits or assign them from any card's details panel.",
  },
  {
    icon: FileText,
    title: "Daily notes that stick",
    description: "Press ⌘+T to jump into today's note. Templates keep recurring notes consistent.",
  },
  {
    icon: Link2,
    title: "Backlinks & insight",
    description: "Notes automatically crosslink. Use the Links tab to explore connected ideas.",
  },
  {
    icon: Calendar,
    title: "Calendar integration",
    description: "Schedule cards to dates, view upcoming items, and see holidays at a glance.",
  },
  {
    icon: Tags,
    title: "Smart tagging",
    description: "Tag cards for quick filtering. Tags sync across all your devices instantly.",
  },
];

const featureHighlights = [
  {
    icon: Command,
    title: "Command Palette",
    description: "Launch with ⌘K to search notes, cards, and run actions instantly.",
    size: "normal",
  },
  {
    icon: Sparkles,
    title: "Smart Capture",
    description: "Browser extension saves articles, videos, and bookmarks in one click with auto-metadata.",
    size: "normal",
  },
  {
    icon: Link2,
    title: "Backlinks",
    description: "Notes automatically link to references. Check the Links tab for context.",
    size: "normal",
  },
  {
    icon: MousePointer,
    title: "Gestures & Shortcuts",
    description: "Drag cards into Pawkits, use keyboard shortcuts, press ? for help.",
    size: "normal",
  },
  {
    icon: Calendar,
    title: "Calendar View",
    description: "Visual timeline for scheduled cards, events, and daily notes.",
    size: "normal",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    description: "Connect Google Drive, Dropbox, OneDrive, or Filen for seamless backup.",
    size: "normal",
  },
  {
    icon: Layers,
    title: "Multiple Views",
    description: "Grid, list, masonry, and compact layouts adapt to your workflow.",
    size: "normal",
  },
  {
    icon: Palette,
    title: "Themes & Accent Colors",
    description: "Dark, light, or auto mode with customizable accent colors.",
    size: "normal",
  },
  {
    icon: Shield,
    title: "Private Pawkits",
    description: "The Den keeps sensitive content hidden from main views.",
    size: "normal",
  },
  {
    icon: Clock,
    title: "Activity Timeline",
    description: "Track when cards were added, modified, or scheduled.",
    size: "normal",
  },
];

function KeyboardKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md text-xs font-semibold"
      style={{
        background: 'var(--bg-surface-3)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--raised-shadow-sm)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--raised-border-top)',
      }}
    >
      {children}
    </kbd>
  );
}

export default function HelpPage() {
  const pathname = usePathname();
  const setLibraryControls = usePanelStore((state) => state.setLibraryControls);

  // Set sidebar content type when this page loads
  useEffect(() => {
    setLibraryControls();
  }, [setLibraryControls, pathname]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: 'var(--ds-accent-muted)',
            boxShadow: 'var(--raised-shadow)',
          }}
        >
          <HelpCircle className="h-7 w-7" style={{ color: 'var(--ds-accent)' }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Help Center
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Discover every power feature, master the hotkeys, and stay organized with confidence.
          </p>
        </div>
      </div>

      {/* Main Content Grid - Responsive */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column - Command Palette & Shortcuts (larger) */}
        <div
          className="xl:w-[55%] rounded-2xl p-6"
          style={{
            background: 'var(--bg-surface-2)',
            boxShadow: 'var(--shadow-2)',
            border: '1px solid var(--border-subtle)',
            borderTopColor: 'var(--border-highlight-top)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'var(--ds-accent-muted)',
              }}
            >
              <Command className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Command Palette & Shortcuts
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Press <KeyboardKey>⌘</KeyboardKey> <KeyboardKey>K</KeyboardKey> anywhere to search and run any action
              </p>
            </div>
          </div>

          {/* Shortcut Groups - Stacked Column */}
          <div className="flex flex-col gap-4">
            {hotkeyGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.title}
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--bg-surface-1)',
                    boxShadow: 'var(--inset-shadow)',
                    border: 'var(--inset-border)',
                    borderBottomColor: 'var(--inset-border-bottom)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Keyboard className="h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {group.title}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.description}
                        className="flex items-center justify-between gap-2 py-1"
                      >
                        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                          {item.description}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.keys.map((key, index) => (
                            <KeyboardKey key={`${item.description}-${index}`}>{key}</KeyboardKey>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            Press <KeyboardKey>?</KeyboardKey> anywhere to see the full shortcut list
          </p>
        </div>

        {/* Right Column - Playbook + Quick Links */}
        <div className="xl:w-[45%] flex flex-col gap-6">
          {/* Pawkit Playbook */}
          <div
            className="rounded-2xl p-6 flex-1"
            style={{
              background: 'var(--bg-surface-2)',
              boxShadow: 'var(--shadow-2)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: 'var(--ds-accent-muted)',
                }}
              >
                <Bookmark className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Pawkit Playbook
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Themed spaces for your saved content
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pawkitGuides.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    boxShadow: 'var(--raised-shadow-sm)',
                    border: '1px solid var(--border-subtle)',
                    borderTopColor: 'var(--raised-border-top)',
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--ds-accent)' }} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link
                href="/pawkits"
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'var(--bg-surface-3)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--raised-shadow-sm)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--raised-border-top)',
                }}
              >
                Explore Pawkits
                <span style={{ color: 'var(--ds-accent)' }}>→</span>
              </Link>
              <Link
                href="/notes"
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'var(--bg-surface-3)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--raised-shadow-sm)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--raised-border-top)',
                }}
              >
                Daily Notes
                <span style={{ color: 'var(--ds-accent)' }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights - Flowing Grid */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'var(--ds-accent-muted)',
            }}
          >
            <Zap className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Feature Highlights
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Everything Pawkit can do for you
            </p>
          </div>
        </div>

        {/* Responsive flowing grid */}
        <div className="flex flex-wrap gap-4">
          {featureHighlights.map(({ icon: Icon, title, description }, index) => {
            // Vary sizes for visual interest
            const isWide = index === 0 || index === 5;
            return (
              <div
                key={title}
                className={`flex gap-3 p-4 rounded-xl transition-all ${
                  isWide ? 'basis-full sm:basis-[calc(50%-8px)] lg:basis-[calc(33.333%-11px)]' : 'basis-full sm:basis-[calc(50%-8px)] lg:basis-[calc(25%-12px)]'
                }`}
                style={{
                  background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                  boxShadow: 'var(--raised-shadow-sm)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--raised-border-top)',
                  flexGrow: 1,
                  minWidth: '200px',
                }}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--ds-accent)' }} />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Help */}
      <div
        className="text-center py-6 rounded-2xl"
        style={{
          background: 'var(--bg-surface-1)',
          boxShadow: 'var(--inset-shadow)',
          border: 'var(--inset-border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Need more help? Press <KeyboardKey>?</KeyboardKey> anywhere for shortcuts, or{' '}
          <Link href="/settings" className="underline" style={{ color: 'var(--ds-accent)' }}>
            visit Settings
          </Link>{' '}
          to customize your experience.
        </p>
      </div>
    </div>
  );
}
