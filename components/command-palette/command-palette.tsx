"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { CardModel, CollectionNode } from "@/lib/types";
import {
  Home,
  Library,
  FileText,
  Calendar,
  Layers,
  Bookmark,
  Clock,
  TrendingUp,
  Pin,
  FolderOpen,
  CalendarDays,
  Zap,
} from "lucide-react";
import { DogHouseIcon } from "@/components/icons/dog-house";
import { generateDailyNoteTitle, generateDailyNoteContent, findDailyNoteForDate } from "@/lib/utils/daily-notes";
import { isProbablyUrl } from "@/lib/utils/strings";

// LocalStorage keys
const PINNED_COMMANDS_KEY = "pawkit-pinned-commands";
const COMMAND_FREQUENCY_KEY = "pawkit-command-frequency";
const RECENT_ITEMS_KEY = "pawkit-recent-items";

// Fuzzy search function
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  if (textLower === queryLower) return 1000;
  if (textLower.startsWith(queryLower)) return 900;
  if (textLower.includes(queryLower)) return 500;

  let queryIndex = 0;
  let matchScore = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matchScore += 100 - i;
      queryIndex++;
    }
  }

  if (queryIndex === queryLower.length) {
    return matchScore;
  }

  return 0;
}

// Command type
type CommandType = "action" | "navigation" | "note" | "card" | "pawkit";

type Command = {
  id: string;
  type: CommandType;
  label: string;
  description?: string;
  icon: React.ComponentType<any>;
  action: () => void;
  keywords?: string[];
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onOpenCreateNote: () => void;
  onOpenCreateCard: () => void;
  initialValue?: string;
};

export function CommandPalette({
  open,
  onClose,
  onOpenCreateNote,
  onOpenCreateCard,
  initialValue = "",
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { cards, collections, addCard } = useDemoAwareStore();

  // Detect if we're in demo mode and use appropriate path prefix
  const isDemo = pathname?.startsWith('/demo');
  const pathPrefix = isDemo ? '/demo' : '';

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [commandFrequency, setCommandFrequency] = useState<Record<string, number>>({});
  const [recentItems, setRecentItems] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load pinned commands, frequency, and recents from localStorage
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const pinned = localStorage.getItem(PINNED_COMMANDS_KEY);
    if (pinned) setPinnedIds(JSON.parse(pinned));

    const frequency = localStorage.getItem(COMMAND_FREQUENCY_KEY);
    if (frequency) setCommandFrequency(JSON.parse(frequency));

    const recents = localStorage.getItem(RECENT_ITEMS_KEY);
    if (recents) setRecentItems(JSON.parse(recents));
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Reset state when closed or set initial value when opened
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    } else if (initialValue) {
      setQuery(initialValue);
      setSelectedIndex(0);
    }
  }, [open, initialValue]);

  // Execute command and track usage
  const executeCommand = useCallback((command: Command) => {
    // Track frequency
    const newFrequency = {
      ...commandFrequency,
      [command.id]: (commandFrequency[command.id] || 0) + 1,
    };
    setCommandFrequency(newFrequency);
    localStorage.setItem(COMMAND_FREQUENCY_KEY, JSON.stringify(newFrequency));

    // Track recent (add to beginning, keep last 10)
    const newRecents = [command.id, ...recentItems.filter((id) => id !== command.id)].slice(0, 10);
    setRecentItems(newRecents);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(newRecents));

    // Execute action
    command.action();
    onClose();
  }, [commandFrequency, recentItems, onClose]);

  // Toggle pin
  const togglePin = useCallback((commandId: string) => {
    const newPinned = pinnedIds.includes(commandId)
      ? pinnedIds.filter((id) => id !== commandId)
      : [...pinnedIds, commandId];
    setPinnedIds(newPinned);
    localStorage.setItem(PINNED_COMMANDS_KEY, JSON.stringify(newPinned));
  }, [pinnedIds]);

  // Create or open today's daily note
  const createDailyNote = useCallback(async () => {
    const today = new Date();

    // Check if daily note already exists
    const existingNote = findDailyNoteForDate(cards, today);

    if (existingNote) {
      // Open existing note
      // If already on /notes, force hash change by going to /notes first, then to hash
      const notesPath = `${pathPrefix}/notes`;
      if (pathname === notesPath) {
        // Clear hash first, then set it
        window.location.hash = '';
        setTimeout(() => {
          window.location.hash = existingNote.id;
        }, 10);
      } else {
        router.push(`${notesPath}#${existingNote.id}`);
      }
    } else {
      // Create new daily note
      const title = generateDailyNoteTitle(today);
      const content = generateDailyNoteContent(today);

      await addCard({
        type: "md-note",
        title,
        content,
        tags: ["daily"],
        collections: [],
      });

      router.push(`${pathPrefix}/notes`);
    }
  }, [cards, addCard, router, pathname, pathPrefix]);

  // Define all commands
  const allCommands = useMemo(() => {
    const commands: Command[] = [];

    // If query is a URL, add quick-add command at the top
    if (query.trim() && isProbablyUrl(query.trim())) {
      commands.push({
        id: "quick-add-url",
        type: "action",
        label: `Quick Add: ${query.trim()}`,
        description: "Save this URL to your library",
        icon: Zap,
        action: async () => {
          await addCard({ url: query.trim(), type: 'url' });
          setQuery("");
          const libraryPath = `${pathPrefix}/library`;
          if (pathname !== libraryPath) {
            router.push(libraryPath);
          }
        },
        keywords: ["quick", "add", "url", "save"],
      });
    }

    // Regular commands
    commands.push(
      // Actions
      {
        id: "create-note",
        type: "action",
        label: "Create New Note",
        description: "Create a new markdown or text note",
        icon: FileText,
        action: () => onOpenCreateNote(),
        keywords: ["new", "note", "create", "add"],
      },
      {
        id: "create-bookmark",
        type: "action",
        label: "Create New Bookmark",
        description: "Save a URL to your library",
        icon: Bookmark,
        action: () => onOpenCreateCard(),
        keywords: ["new", "bookmark", "url", "save", "create", "add"],
      },
      {
        id: "daily-note",
        type: "action",
        label: "Open Today's Daily Note",
        description: "Create or open your daily note",
        icon: CalendarDays,
        action: () => createDailyNote(),
        keywords: ["daily", "today", "journal"],
      },
      // Navigation
      {
        id: "nav-home",
        type: "navigation",
        label: "Go to Home",
        icon: Home,
        action: () => router.push(`${pathPrefix}/home`),
        keywords: ["home", "dashboard"],
      },
      {
        id: "nav-library",
        type: "navigation",
        label: "Go to Library",
        icon: Library,
        action: () => router.push(`${pathPrefix}/library`),
        keywords: ["library", "bookmarks", "cards"],
      },
      {
        id: "nav-notes",
        type: "navigation",
        label: "Go to Notes",
        icon: FileText,
        action: () => router.push(`${pathPrefix}/notes`),
        keywords: ["notes"],
      },
      {
        id: "nav-calendar",
        type: "navigation",
        label: "Go to Calendar",
        icon: Calendar,
        action: () => router.push(`${pathPrefix}/calendar`),
        keywords: ["calendar", "schedule"],
      },
      {
        id: "nav-den",
        type: "navigation",
        label: "Go to The Den",
        icon: DogHouseIcon,
        action: () => router.push(`${pathPrefix}/den`),
        keywords: ["den", "private", "secure"],
      },
      {
        id: "nav-dig-up",
        type: "navigation",
        label: "Dig Up (Review Cards)",
        icon: Layers,
        action: () => router.push(`${pathPrefix}/distill`),
        keywords: ["dig", "up", "review", "distill"],
      },
    );

    // Add notes to commands (exclude private pawkit cards)
    const notes = cards.filter((c) => (c.type === "md-note" || c.type === "text-note") && !c.inDen);
    notes.forEach((note) => {
      commands.push({
        id: `note-${note.id}`,
        type: "note",
        label: note.title || "Untitled Note",
        description: note.content?.substring(0, 60) || "",
        icon: FileText,
        action: () => router.push(`${pathPrefix}/notes#${note.id}`),
        keywords: [note.title || "", ...(note.tags || [])],
      });
    });

    // Add bookmarks to commands (exclude private pawkit cards)
    const bookmarks = cards.filter((c) => c.type === "url" && !c.inDen);
    bookmarks.forEach((bookmark) => {
      commands.push({
        id: `card-${bookmark.id}`,
        type: "card",
        label: bookmark.title || bookmark.url || "Untitled",
        description: bookmark.domain || bookmark.url,
        icon: Bookmark,
        action: () => router.push(`${pathPrefix}/library#${bookmark.id}`),
        keywords: [bookmark.title || "", bookmark.domain || "", ...(bookmark.tags || [])],
      });
    });

    // Add pawkits (collections) to commands
    const flattenCollections = (nodes: CollectionNode[]): CollectionNode[] => {
      let result: CollectionNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenCollections(node.children));
        }
      }
      return result;
    };

    const allCollections = flattenCollections(collections);
    allCollections.forEach((collection) => {
      commands.push({
        id: `pawkit-${collection.id}`,
        type: "pawkit",
        label: `Go to "${collection.name}" Pawkit`,
        description: `Open the ${collection.name} collection`,
        icon: FolderOpen,
        action: () => router.push(`${pathPrefix}/pawkits/${collection.slug || collection.id}`),
        keywords: [collection.name, "pawkit", "collection"],
      });
    });

    return commands;
  }, [cards, collections, router, onOpenCreateNote, onOpenCreateCard, createDailyNote, query, pathname, addCard, pathPrefix]);

  // Filter and score commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands;
    }

    const scored = allCommands
      .map((command) => {
        const labelScore = fuzzySearch(query, command.label);
        const descScore = command.description ? fuzzySearch(query, command.description) : 0;
        const keywordsScore = command.keywords
          ? Math.max(...command.keywords.map((kw) => fuzzySearch(query, kw)))
          : 0;

        const maxScore = Math.max(labelScore, descScore, keywordsScore);
        return { command, score: maxScore };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((item) => item.command);
  }, [query, allCommands]);

  // Organize commands into sections
  const { pinnedCommands, frequentCommands, recentCommands, otherCommands } = useMemo(() => {
    const pinned: Command[] = [];
    const frequent: Command[] = [];
    const recent: Command[] = [];
    const other: Command[] = [];

    // If there's a query, just return filtered results
    if (query.trim()) {
      return {
        pinnedCommands: [],
        frequentCommands: [],
        recentCommands: [],
        otherCommands: filteredCommands,
      };
    }

    // Get top 3 most frequent command IDs
    const topFrequentIds = Object.entries(commandFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id);

    // Organize commands
    filteredCommands.forEach((command) => {
      if (pinnedIds.includes(command.id)) {
        pinned.push(command);
      } else if (topFrequentIds.includes(command.id)) {
        frequent.push(command);
      } else if (recentItems.includes(command.id)) {
        recent.push(command);
      } else {
        other.push(command);
      }
    });

    // Sort frequent by count (descending)
    frequent.sort((a, b) => {
      const aCount = commandFrequency[a.id] || 0;
      const bCount = commandFrequency[b.id] || 0;
      return bCount - aCount;
    });

    // Sort recent by recency
    recent.sort((a, b) => {
      const aIndex = recentItems.indexOf(a.id);
      const bIndex = recentItems.indexOf(b.id);
      return aIndex - bIndex;
    });

    return {
      pinnedCommands: pinned,
      frequentCommands: frequent,
      recentCommands: recent.slice(0, 5),
      otherCommands: other,
    };
  }, [query, filteredCommands, pinnedIds, commandFrequency, recentItems]);

  // Flatten all visible commands for keyboard navigation
  const allVisibleCommands = useMemo(() => {
    if (query.trim()) {
      return otherCommands;
    }
    return [
      ...pinnedCommands,
      ...frequentCommands,
      ...recentCommands,
      ...otherCommands.slice(0, 5), // Limit "other" section when not searching
    ];
  }, [query, pinnedCommands, frequentCommands, recentCommands, otherCommands]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allVisibleCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allVisibleCommands.length) % allVisibleCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const command = allVisibleCommands[selectedIndex];
        if (command) {
          executeCommand(command);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, allVisibleCommands, selectedIndex, executeCommand, onClose]);

  // Reset selected index when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, allVisibleCommands.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current) {
      const buttons = containerRef.current.querySelectorAll("button[data-command-item]");
      const selectedButton = buttons[selectedIndex];
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!open || typeof document === "undefined") return null;

  const renderCommand = (command: Command, index: number, sectionType?: string) => {
    const Icon = command.icon;
    const frequency = commandFrequency[command.id] || 0;
    const isSelected = index === selectedIndex;

    return (
      <button
        key={command.id}
        data-command-item
        onClick={() => executeCommand(command)}
        onContextMenu={(e) => {
          e.preventDefault();
          togglePin(command.id);
        }}
        className={`relative group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all overflow-hidden rounded-lg ${
          isSelected
            ? "text-foreground"
            : "hover:bg-surface-soft/50 text-foreground"
        }`}
        style={{
          background: isSelected
            ? "linear-gradient(180deg, hsla(var(--accent) / 0.08) 0%, hsla(var(--accent) / 0.15) 100%)"
            : undefined,
          borderColor: isSelected ? "hsla(var(--accent) / 0.35)" : "transparent",
          borderWidth: isSelected ? "1px" : "0",
          boxShadow: isSelected
            ? "0 0 20px -5px hsla(var(--accent) / 0.3), inset 0 1px 1px 0 hsla(var(--accent) / 0.1)"
            : undefined,
        }}
      >
        <Icon size={18} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{command.label}</div>
          {command.description && (
            <div className="text-xs text-muted-foreground truncate">
              {command.description}
            </div>
          )}
        </div>
        {sectionType === "frequent" && frequency > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {frequency}×
            </span>
          </div>
        )}
      </button>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] p-4"
      onClick={onClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-accent flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-foreground text-base focus:outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono bg-surface-soft border border-subtle rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Commands List */}
        <div
          ref={containerRef}
          className="overflow-y-auto max-h-[60vh] py-2"
          style={{ scrollbarGutter: "stable" }}
        >
          {allVisibleCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No results found
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {!query && pinnedCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <Pin size={12} />
                    Pinned
                  </div>
                  {pinnedCommands.map((cmd, idx) => renderCommand(cmd, idx, "pinned"))}
                </div>
              )}

              {/* Frequently Used Section */}
              {!query && frequentCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <TrendingUp size={12} />
                    Frequently Used
                  </div>
                  {frequentCommands.map((cmd, idx) => renderCommand(cmd, pinnedCommands.length + idx, "frequent"))}
                </div>
              )}

              {/* Recent Section */}
              {!query && recentCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <Clock size={12} />
                    Recent
                  </div>
                  {recentCommands.map((cmd, idx) =>
                    renderCommand(cmd, pinnedCommands.length + frequentCommands.length + idx, "recent")
                  )}
                </div>
              )}

              {/* Search Results or Other Commands */}
              {query ? (
                <div className="mb-2">
                  {otherCommands.map((cmd, idx) => renderCommand(cmd, idx, "search"))}
                </div>
              ) : (
                otherCommands.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                      All Commands
                    </div>
                    {otherCommands.slice(0, 5).map((cmd, idx) =>
                      renderCommand(
                        cmd,
                        pinnedCommands.length + frequentCommands.length + recentCommands.length + idx,
                        "other"
                      )
                    )}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-soft border border-subtle rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-soft border border-subtle rounded">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-soft border border-subtle rounded">↵</kbd>
              select
            </span>
          </div>
          <span>Right-click to pin</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
