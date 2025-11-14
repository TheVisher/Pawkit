"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Home, Library, FolderOpen, FileText, Star, User, Layers, Calendar, CalendarDays, CalendarClock, Flame, Clock, Tag, Lock } from "lucide-react";
import { type CollectionNode } from "@/lib/types";
import { ProfileModal } from "@/components/modals/profile-modal";
import { useDataStore } from "@/lib/stores/data-store";
import { shallow } from "zustand/shallow";
import { findDailyNoteForDate, generateDailyNoteTitle, generateDailyNoteContent, getDailyNotes } from "@/lib/utils/daily-notes";
import { useRecentHistory } from "@/lib/hooks/use-recent-history";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { SyncStatus } from "@/components/sync/sync-status";
import { KeyboardShortcuts } from "@/components/sidebar/keyboard-shortcuts";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AppSidebarProps = {
  username: string;
  displayName?: string | null;
  collections: CollectionNode[];
};

const navigationItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/distill", label: "Dig Up", icon: Layers },
];

// Note: Changelog, Trash, Help moved to right sidebar control panel
// Removed bottomItems array as it's no longer used

export function AppSidebar({ username, displayName, collections }: AppSidebarProps) {
  console.log('Sidebar rendered');

  const pathname = usePathname();
  const router = useRouter();
  const isDemo = pathname?.startsWith('/demo');
  const [isPawkitsExpanded, setIsPawkitsExpanded] = React.useState(false);
  const [expandedCollections, setExpandedCollections] = React.useState<Set<string>>(new Set());
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  // Get only daily notes from data store to prevent unnecessary re-renders
  const dailyNoteCards = useDataStore(
    (state) => state.cards.filter((c) => c.tags?.includes('daily')),
    shallow
  );
  const addCard = useDataStore((state) => state.addCard);

  // Recent history
  const { recentItems } = useRecentHistory();

  // Get sidebar visibility settings
  const showKeyboardShortcutsInSidebar = useSettingsStore((state) => state.showKeyboardShortcutsInSidebar);

  // Load Pawkits expansion state from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem('pawkits-collections-expanded');
    if (saved === 'true') {
      setIsPawkitsExpanded(true);
    }
  }, []);

  // Save Pawkits expansion state to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem('pawkits-collections-expanded', String(isPawkitsExpanded));
  }, [isPawkitsExpanded]);

  // Load expanded collections from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem('pawkits-expanded-collections');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setExpandedCollections(new Set(parsed.filter((item): item is string => typeof item === 'string')));
      }
    } catch {
      // ignore malformed state
    }
  }, []);

  // Save expanded collections to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem('pawkits-expanded-collections', JSON.stringify(Array.from(expandedCollections)));
  }, [expandedCollections]);

  const isActive = React.useCallback((href: string) => {
    if (!pathname) return false;
    if (href === "/home" && (pathname === "/" || pathname === "/home")) {
      return true;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }, [pathname]);

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

  // Calculate daily note streak
  const dailyNoteStreak = React.useMemo(() => {
    const dailyNotes = getDailyNotes(dailyNoteCards);
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
        // Stop counting if we hit a day without a note (but allow today to be missing)
        break;
      }
    }

    return streak;
  }, [dailyNoteCards]);

  // Navigate to today's note (create if doesn't exist)
  const goToTodaysNote = React.useCallback(async () => {
    const today = new Date();
    const existingNote = findDailyNoteForDate(dailyNoteCards, today);

    if (existingNote) {
      router.push(`/notes#${existingNote.id}`);
    } else {
      // Create today's note
      const title = generateDailyNoteTitle(today);
      const content = generateDailyNoteContent(today);

      await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        inDen: false,
      });

      // Wait a bit for the card to be added to the store, then find it and navigate
      setTimeout(() => {
        const newNote = findDailyNoteForDate(useDataStore.getState().cards, today);
        if (newNote) {
          router.push(`/notes#${newNote.id}`);
        }
      }, 100);
    }
  }, [dailyNoteCards, addCard, router]);

  // Navigate to yesterday's note
  const goToYesterdaysNote = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const existingNote = findDailyNoteForDate(dailyNoteCards, yesterday);

    if (existingNote) {
      router.push(`/notes#${existingNote.id}`);
    } else {
      // Just go to calendar if yesterday's note doesn't exist
      router.push('/calendar');
    }
  };

  // Keyboard shortcut: Cmd+Shift+D for today's note
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for both 'd' and 'D' to handle different browser behaviors
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        goToTodaysNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToTodaysNote]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={isDemo ? "/demo/home" : "/home"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image src="/logo.png" alt="Pawkit" width={32} height={32} className="w-8 h-8" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Pawkit</span>
                  <span className="truncate text-xs">{isDemo ? "Demo Mode" : "Knowledge Manager"}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const href = isDemo ? `/demo${item.href}` : item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(href)}>
                      <Link href={href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Pawkits */}
              <Collapsible open={isPawkitsExpanded} onOpenChange={setIsPawkitsExpanded}>
                <SidebarMenuItem>
                  <div className="flex w-full items-center">
                    <SidebarMenuButton asChild isActive={isActive(isDemo ? "/demo/pawkits" : "/pawkits")} className="flex-1">
                      <Link href={isDemo ? "/demo/pawkits" : "/pawkits"}>
                        <FolderOpen />
                        <span>Pawkits</span>
                      </Link>
                    </SidebarMenuButton>
                    {collections && collections.length > 0 && (
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsPawkitsExpanded(!isPawkitsExpanded);
                          }}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${isPawkitsExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                </SidebarMenuItem>
                {collections && collections.length > 0 && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {collections.map((collection) => {
                        const hasChildren = collection.children && collection.children.length > 0;
                        const isExpanded = expandedCollections.has(collection.id);
                        const pawkitHref = isDemo ? `/demo/pawkits/${collection.id}` : `/pawkits/${collection.slug || collection.id}`;
                        const isCollectionActive = pathname === pawkitHref;

                        return (
                          <Collapsible
                            key={collection.id}
                            open={isExpanded}
                            onOpenChange={() => hasChildren && toggleCollection(collection.id)}
                          >
                            <SidebarMenuSubItem>
                              <div className="flex w-full items-center">
                                <SidebarMenuSubButton asChild isActive={isCollectionActive} className="flex-1">
                                  <Link href={pawkitHref}>
                                    {collection.isPrivate ? <Lock className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                                    <span>{collection.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                {hasChildren && (
                                  <CollapsibleTrigger asChild>
                                    <button
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleCollection(collection.id);
                                      }}
                                    >
                                      <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                  </CollapsibleTrigger>
                                )}
                              </div>
                            </SidebarMenuSubItem>
                            {hasChildren && collection.children && (
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4">
                                  {collection.children.map((child) => {
                                    const childHref = isDemo ? `/demo/pawkits/${child.id}` : `/pawkits/${child.slug || child.id}`;
                                    return (
                                      <SidebarMenuSubItem key={child.id}>
                                        <SidebarMenuSubButton asChild isActive={pathname === childHref}>
                                          <Link href={childHref}>
                                            {child.isPrivate ? <Lock className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                                            <span>{child.name}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </Collapsible>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Daily Notes Quick Access */}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Daily Notes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Today's Note */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={goToTodaysNote}>
                  <CalendarDays />
                  <span>Today&apos;s Note</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Yesterday's Note */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={goToYesterdaysNote}>
                  <CalendarClock />
                  <span>Yesterday&apos;s Note</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Streak Counter */}
              {dailyNoteStreak > 0 && (
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>{dailyNoteStreak} day streak</span>
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recently Viewed */}
        {recentItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Recently Viewed</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {recentItems.slice(0, 5).map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild>
                        <Link href={item.type === "note" ? `/notes#${item.id}` : `/library?q=${encodeURIComponent(item.title)}`}>
                          <Clock className="h-4 w-4" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />
      </SidebarContent>

      <SidebarFooter>
        {/* Keyboard Shortcuts - Conditional based on settings */}
        {showKeyboardShortcutsInSidebar && <KeyboardShortcuts />}
      </SidebarFooter>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        username={username}
      />
    </Sidebar>
  );
}
