"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { Home, Library, FileText, Calendar, Tag, Settings, BookOpen, Clock, Trash2, HelpCircle, X, FolderOpen, ChevronRight, Layers, CalendarDays, CalendarClock, Flame, User } from "lucide-react";
import { PanelSection } from "@/components/control-panel/control-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useRecentHistory } from "@/lib/hooks/use-recent-history";
import { findDailyNoteForDate, generateDailyNoteTitle, generateDailyNoteContent, getDailyNotes } from "@/lib/utils/daily-notes";
import { DogHouseIcon } from "@/components/icons/dog-house";
import { type CollectionNode } from "@/lib/types";

type NavItem = {
  id: string;
  label: string;
  icon: any;
  href: string;
};

const navigationItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/home" },
  { id: "library", label: "Library", icon: Library, href: "/library" },
  { id: "tags", label: "Tags", icon: Tag, href: "/tags" },
  { id: "notes", label: "Notes", icon: FileText, href: "/notes" },
  { id: "calendar", label: "Calendar", icon: Calendar, href: "/calendar" },
  { id: "den", label: "The Den", icon: DogHouseIcon, href: "/den" },
  { id: "distill", label: "Dig Up", icon: Layers, href: "/distill" },
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
  username?: string;
  displayName?: string | null;
  collections?: CollectionNode[];
};

export function LeftNavigationPanel({
  open,
  onClose,
  mode = "floating",
  onModeChange,
  username = "User",
  displayName,
  collections = []
}: LeftNavigationPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  // Get cards and data
  const { cards, addCard } = useDataStore();
  const { recentItems } = useRecentHistory();

  // Calculate daily note streak
  const dailyNoteStreak = useMemo(() => {
    const dailyNotes = getDailyNotes(cards);
    if (dailyNotes.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];

      const hasNote = dailyNotes.some(note => note.date === dateString);
      if (hasNote) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }, [cards]);

  const handleModeToggle = () => {
    const newMode = mode === "floating" ? "anchored" : "floating";
    onModeChange?.(newMode);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Navigate to today's note
  const goToTodaysNote = useCallback(async () => {
    const today = new Date();
    const existingNote = findDailyNoteForDate(cards, today);

    if (existingNote) {
      router.push(`/notes#${existingNote.id}`);
    } else {
      const title = generateDailyNoteTitle(today);
      const content = generateDailyNoteContent(today);

      await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        inDen: false,
      });

      setTimeout(() => {
        const newNote = findDailyNoteForDate(useDataStore.getState().cards, today);
        if (newNote) {
          router.push(`/notes#${newNote.id}`);
        }
      }, 100);
    }
  }, [cards, addCard, router]);

  // Navigate to yesterday's note
  const goToYesterdaysNote = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const existingNote = findDailyNoteForDate(cards, yesterday);

    if (existingNote) {
      router.push(`/notes#${existingNote.id}`);
    } else {
      router.push('/calendar');
    }
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
          fixed top-0 left-0 bottom-0 w-[325px] z-[102]
          bg-white/5 backdrop-blur-lg
          flex flex-col
          animate-slide-in-left
          ${mode === "floating"
            ? "m-4 rounded-2xl shadow-2xl border border-white/10"
            : "border-r border-white/10"
          }
        `}
        style={{
          boxShadow: mode === "floating"
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)"
            : "inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)"
        }}
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
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)"
          }}
        >
          {/* Navigation Section */}
          <PanelSection id="left-navigation" title="Navigation" icon={<Home className="h-4 w-4 text-accent" />}>
            <div className="space-y-1">
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

          {/* Pawkits Section */}
          {collections.length > 0 && (
            <PanelSection id="left-pawkits" title="Pawkits" icon={<FolderOpen className="h-4 w-4 text-accent" />}>
              <div className="space-y-1">
                <button
                  onClick={() => handleNavigate("/pawkits")}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                    ${pathname === "/pawkits"
                      ? "bg-accent text-accent-foreground font-medium"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <FolderOpen size={16} className="flex-shrink-0" />
                  <span className="flex-1 text-left">All Pawkits</span>
                </button>
                {collections.map((collection) => {
                  const hasChildren = collection.children && collection.children.length > 0;
                  const isExpanded = expandedCollections.has(collection.id);
                  const pawkitHref = `/pawkits/${collection.slug || collection.id}`;
                  const isCollectionActive = pathname === pawkitHref;

                  return (
                    <div key={collection.id}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleNavigate(pawkitHref)}
                          className={`
                            flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                            ${isCollectionActive
                              ? "bg-accent text-accent-foreground font-medium"
                              : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                            }
                          `}
                        >
                          <FolderOpen size={14} className="flex-shrink-0" />
                          <span className="flex-1 text-left truncate">{collection.name}</span>
                        </button>
                        {hasChildren && (
                          <button
                            onClick={() => toggleCollection(collection.id)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ChevronRight
                              size={14}
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                        )}
                      </div>
                      {hasChildren && isExpanded && collection.children && (
                        <div className="ml-6 mt-1 space-y-1">
                          {collection.children.map((child) => {
                            const childHref = `/pawkits/${child.slug || child.id}`;
                            return (
                              <button
                                key={child.id}
                                onClick={() => handleNavigate(childHref)}
                                className={`
                                  w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all
                                  ${pathname === childHref
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                                  }
                                `}
                              >
                                <span className="truncate">{child.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </PanelSection>
          )}

          {/* Daily Notes Section */}
          <PanelSection id="left-daily-notes" title="Daily Notes" icon={<CalendarDays className="h-4 w-4 text-accent" />}>
            <div className="space-y-1">
              <button
                onClick={goToTodaysNote}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <CalendarDays size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Today&apos;s Note</span>
              </button>
              <button
                onClick={goToYesterdaysNote}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <CalendarClock size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Yesterday&apos;s Note</span>
              </button>
              {dailyNoteStreak > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Flame size={16} className="text-orange-500" />
                  <span>{dailyNoteStreak} day streak</span>
                </div>
              )}
            </div>
          </PanelSection>

          {/* Recently Viewed Section */}
          {recentItems.length > 0 && (
            <PanelSection id="left-recently-viewed" title="Recently Viewed" icon={<Clock className="h-4 w-4 text-accent" />}>
              <div className="space-y-1">
                {recentItems.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.type === "note" ? `/notes#${item.id}` : `/library?q=${encodeURIComponent(item.title)}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  >
                    <Clock size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </PanelSection>
          )}

          {/* Bottom Section */}
          <PanelSection id="left-bottom" title="More" icon={<HelpCircle className="h-4 w-4 text-accent" />}>
            <div className="space-y-1">
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

          {/* User Profile */}
          <div className="pt-2 border-t border-white/10">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all bg-white/5 hover:bg-white/10"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-sm flex-shrink-0">
                {(displayName || username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{displayName || username}</div>
                <div className="text-xs text-muted-foreground">View profile</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
