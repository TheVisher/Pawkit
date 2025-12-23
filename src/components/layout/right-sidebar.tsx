'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Filter, Tag, ArrowRightToLine, ArrowLeftFromLine, Maximize2, Minimize2,
  Moon, Sun, SunMoon, Sliders, Home, Calendar, LayoutGrid, List, LayoutDashboard,
  ArrowUpDown, Bookmark, FileText, Video, Image, FileSpreadsheet, Music, HelpCircle,
  Layers, CalendarDays, Globe, Type, Inbox, FolderMinus, TagsIcon,
  X, FolderOpen, Link2, Paperclip, MessageSquare
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRightSidebar } from '@/lib/stores/ui-store';
import { useViewStore, useCardDisplaySettings } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type CardSize = 'small' | 'medium' | 'large' | 'xl';
type ContentType = 'bookmarks' | 'notes' | 'video' | 'images' | 'docs' | 'audio' | 'other';
type GroupBy = 'none' | 'date' | 'tags' | 'type' | 'domain';
type DateGrouping = 'smart' | 'day' | 'week' | 'month' | 'year';
type UnsortedFilter = 'none' | 'no-pawkits' | 'no-tags' | 'both';

// Content type filter definitions with icons (multi-selectable)
const CONTENT_FILTERS: { id: ContentType; label: string; icon: typeof Bookmark }[] = [
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'docs', label: 'Docs', icon: FileSpreadsheet },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'other', label: 'Other', icon: HelpCircle },
];

// Sort options matching V1
const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'updatedAt', label: 'Recently Modified' },
  { id: 'createdAt', label: 'Date Added' },
  { id: 'title', label: 'Title A-Z' },
  { id: 'domain', label: 'Domain' },
];

// Grouping options
const GROUP_OPTIONS: { id: GroupBy; label: string; icon: typeof Layers }[] = [
  { id: 'none', label: 'None', icon: Layers },
  { id: 'date', label: 'Date', icon: CalendarDays },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'type', label: 'Type', icon: Type },
  { id: 'domain', label: 'Domain', icon: Globe },
];

// Date grouping options (when groupBy === 'date')
const DATE_GROUP_OPTIONS: { id: DateGrouping; label: string }[] = [
  { id: 'smart', label: 'Smart' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

// Quick filter options for unsorted/unorganized items
const UNSORTED_OPTIONS: { id: UnsortedFilter; label: string; icon: typeof Inbox | null }[] = [
  { id: 'none', label: 'All', icon: null },
  { id: 'no-pawkits', label: 'No Pawkits', icon: FolderMinus },
  { id: 'no-tags', label: 'No Tags', icon: TagsIcon },
  { id: 'both', label: 'Unsorted', icon: Inbox },
];

// Define which features are available per view type
type ViewType = 'cards' | 'home' | 'calendar' | 'other';

interface ViewConfig {
  type: ViewType;
  title: string;
  showContentFilters: boolean;
  showCardDisplay: boolean;
  showTags: boolean;
}

const VIEW_CONFIGS: Record<ViewType, Omit<ViewConfig, 'title'>> = {
  cards: {
    type: 'cards',
    showContentFilters: true,
    showCardDisplay: true,
    showTags: true,
  },
  home: {
    type: 'home',
    showContentFilters: false,
    showCardDisplay: false,
    showTags: false,
  },
  calendar: {
    type: 'calendar',
    showContentFilters: false,
    showCardDisplay: false,
    showTags: false,
  },
  other: {
    type: 'other',
    showContentFilters: false,
    showCardDisplay: false,
    showTags: false,
  },
};

function getViewConfig(pathname: string): ViewConfig {
  // Library and Pawkits show card controls
  if (pathname === '/library' || pathname.startsWith('/pawkits/')) {
    return { ...VIEW_CONFIGS.cards, title: 'Filters' };
  }
  // Home page
  if (pathname === '/home' || pathname === '/dashboard') {
    return { ...VIEW_CONFIGS.home, title: 'Overview' };
  }
  // Calendar
  if (pathname === '/calendar') {
    return { ...VIEW_CONFIGS.calendar, title: 'Calendar' };
  }
  // Default
  return { ...VIEW_CONFIGS.other, title: 'Options' };
}

export function RightSidebar() {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedPathname, setDisplayedPathname] = useState('');
  const [displayMode, setDisplayMode] = useState<'filters' | 'card-details'>('filters');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pathname = usePathname();
  const { isOpen, isAnchored, toggleAnchored, setOpen } = useRightSidebar();
  const { theme, setTheme } = useTheme();
  const workspace = useCurrentWorkspace();

  // Get active card from modal store
  const activeCardId = useModalStore((s) => s.activeCardId);
  const allCards = useDataStore((s) => s.cards);
  const allCollections = useDataStore((s) => s.collections);
  const activeCard = useMemo(() =>
    activeCardId ? allCards.find(c => c.id === activeCardId) : null,
    [activeCardId, allCards]
  );

  // Get view-specific configuration
  const viewConfig = useMemo(() => getViewConfig(displayedPathname || pathname), [displayedPathname, pathname]);

  // Handle transition between filters and card details view
  useEffect(() => {
    const targetMode = activeCardId ? 'card-details' : 'filters';

    if (targetMode !== displayMode && mounted) {
      // Start exit animation
      setIsTransitioning(true);

      // After exit animation, switch mode and start enter
      const timer = setTimeout(() => {
        setDisplayMode(targetMode);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 200);

      return () => clearTimeout(timer);
    } else if (!mounted) {
      setDisplayMode(targetMode);
    }
  }, [activeCardId, displayMode, mounted]);

  // Handle view transitions with animation
  useEffect(() => {
    if (!mounted) {
      setDisplayedPathname(pathname);
      return;
    }

    if (pathname !== displayedPathname) {
      // Start exit animation
      setIsAnimating(true);

      // After exit animation, update content and start enter animation
      const timer = setTimeout(() => {
        setDisplayedPathname(pathname);
        // Pause before starting enter animation for a nice breathing moment
        setTimeout(() => setIsAnimating(false), 100);
      }, 200); // Exit animation duration

      return () => clearTimeout(timer);
    }
  }, [pathname, displayedPathname, mounted]);

  // Card display settings (only used when viewConfig.showCardDisplay is true)
  const { cardPadding, cardSpacing, cardSize, showMetadataFooter, showUrlPill, showTitles, showTags } = useCardDisplaySettings();
  const layout = useViewStore((s) => s.layout);
  const sortBy = useViewStore((s) => s.sortBy);
  const sortOrder = useViewStore((s) => s.sortOrder);
  const contentTypeFilters = useViewStore((s) => s.contentTypeFilters) as ContentType[];
  const setLayout = useViewStore((s) => s.setLayout);
  const setSortBy = useViewStore((s) => s.setSortBy);
  const toggleSortOrder = useViewStore((s) => s.toggleSortOrder);
  const toggleContentType = useViewStore((s) => s.toggleContentType);
  const clearContentTypes = useViewStore((s) => s.clearContentTypes);
  const setCardPadding = useViewStore((s) => s.setCardPadding);
  const setCardSpacing = useViewStore((s) => s.setCardSpacing);
  const setCardSize = useViewStore((s) => s.setCardSize);
  const setShowMetadataFooter = useViewStore((s) => s.setShowMetadataFooter);
  const setShowUrlPill = useViewStore((s) => s.setShowUrlPill);
  const setShowTitles = useViewStore((s) => s.setShowTitles);
  const setShowTags = useViewStore((s) => s.setShowTags);
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);
  const selectedTags = useViewStore((s) => s.selectedTags);
  const toggleTag = useViewStore((s) => s.toggleTag);
  const clearTags = useViewStore((s) => s.clearTags);
  const unsortedFilter = useViewStore((s) => s.unsortedFilter) as UnsortedFilter;
  const setUnsortedFilter = useViewStore((s) => s.setUnsortedFilter);
  const groupBy = useViewStore((s) => s.groupBy) as GroupBy;
  const dateGrouping = useViewStore((s) => s.dateGrouping) as DateGrouping;
  const setGroupBy = useViewStore((s) => s.setGroupBy);
  const setDateGrouping = useViewStore((s) => s.setDateGrouping);

  // Get all cards to extract unique tags
  const cards = useDataStore((s) => s.cards);
  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const card of cards) {
      if (card._deleted) continue;
      for (const tag of card.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    // Sort by count descending, then alphabetically
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [cards]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save settings when they change (debounced effect)
  const handleSettingChange = useCallback(() => {
    if (workspace) {
      // Debounce save to avoid too many writes
      const timer = setTimeout(() => {
        saveViewSettings(workspace.id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [workspace, saveViewSettings]);

  const handleToggleOpen = () => {
    setOpen(!isOpen);
  };

  // Cycle through themes: system -> dark -> light -> system
  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('system');
    }
  };

  // Get theme icon and label
  const getThemeIcon = () => {
    if (!mounted) return { icon: SunMoon, label: 'System theme' };
    switch (theme) {
      case 'dark':
        return { icon: Moon, label: 'Dark mode' };
      case 'light':
        return { icon: Sun, label: 'Light mode' };
      default:
        return { icon: SunMoon, label: 'System theme' };
    }
  };

  const themeInfo = getThemeIcon();
  const ThemeIcon = themeInfo.icon;

  // Use default values during SSR to match initial client render
  const anchored = mounted ? isAnchored : false;
  const open = mounted ? isOpen : false;

  return (
    <div className="h-full flex flex-col">
      {/* Header with close and anchor buttons (mirrored from left sidebar) */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border-subtle">
        {/* Buttons on left side (mirrored from left panel) */}
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Open/Close Button (first on right panel) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleOpen}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {open ? <ArrowRightToLine className="h-5 w-5" /> : <ArrowLeftFromLine className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={displayMode === 'card-details' ? 'z-[70]' : ''}>
                <p>{open ? 'Close sidebar' : 'Open sidebar'}</p>
              </TooltipContent>
            </Tooltip>
            {/* Anchor Toggle (second on right panel) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAnchored}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {anchored ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={displayMode === 'card-details' ? 'z-[70]' : ''}>
                <p>{anchored ? 'Float panel' : 'Anchor panel'}</p>
              </TooltipContent>
            </Tooltip>
            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleTheme}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  <ThemeIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={displayMode === 'card-details' ? 'z-[70]' : ''}>
                <p>{themeInfo.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-text-secondary">
          {displayMode === 'card-details' ? 'Card Details' : viewConfig.title}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Card Details Panel - shown when a card modal is open */}
        {displayMode === 'card-details' && activeCard && (
          <div
            className={cn(
              'space-y-4 transition-all ease-out',
              isTransitioning
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            )}
            style={{ transitionDuration: '250ms' }}
          >
            {/* Tags Section */}
            <div>
              <div className="flex items-center gap-2 text-text-muted mb-3">
                <Tag className="h-5 w-5" />
                <span className="text-xs font-medium uppercase">Tags</span>
              </div>
              {activeCard.tags && activeCard.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeCard.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 text-xs rounded-md bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No tags</p>
              )}
            </div>

            <Separator className="bg-border-subtle" />

            {/* Pawkit (Collection) Section */}
            <div>
              <div className="flex items-center gap-2 text-text-muted mb-3">
                <FolderOpen className="h-5 w-5" />
                <span className="text-xs font-medium uppercase">Pawkits</span>
              </div>
              {activeCard.collections && activeCard.collections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeCard.collections.map((collectionSlug) => {
                    const collection = allCollections.find(c => c.slug === collectionSlug);
                    return (
                      <span
                        key={collectionSlug}
                        className="px-2.5 py-1 text-xs rounded-md bg-bg-surface-2 text-text-primary border border-border-subtle"
                      >
                        {collection?.name || collectionSlug}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">Not in any Pawkit</p>
              )}
            </div>

            <Separator className="bg-border-subtle" />

            {/* Backlinks Section (placeholder for Phase 7.2) */}
            <div>
              <div className="flex items-center gap-2 text-text-muted mb-3">
                <Link2 className="h-5 w-5" />
                <span className="text-xs font-medium uppercase">Backlinks</span>
              </div>
              <p className="text-xs text-text-muted italic">No backlinks yet</p>
            </div>

            <Separator className="bg-border-subtle" />

            {/* Attachments Section (placeholder) */}
            <div>
              <div className="flex items-center gap-2 text-text-muted mb-3">
                <Paperclip className="h-5 w-5" />
                <span className="text-xs font-medium uppercase">Attachments</span>
              </div>
              <p className="text-xs text-text-muted italic">No attachments</p>
            </div>

            <Separator className="bg-border-subtle" />

            {/* Kit Chat Section (placeholder) */}
            <div>
              <div className="flex items-center gap-2 text-text-muted mb-3">
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs font-medium uppercase">Kit Chat</span>
              </div>
              <div className="px-3 py-4 rounded-lg bg-bg-surface-2 border border-border-subtle text-center">
                <p className="text-xs text-text-muted">AI assistant coming soon</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-2 space-y-1 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{new Date(activeCard.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{new Date(activeCard.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters Panel - shown when no card modal is open */}
        {displayMode === 'filters' && (
          <div
            key={displayedPathname}
            className={cn(
              'space-y-4 transition-all ease-out',
              isAnimating || isTransitioning
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            )}
            style={{ transitionDuration: '250ms' }}
          >
          {/* Content Type Filter - Card views only (multi-select) */}
          {viewConfig.showContentFilters && (
            <>
              <div>
                <div className="flex items-center justify-between text-text-muted mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <span className="text-xs font-medium uppercase">Content Type</span>
                  </div>
                  {contentTypeFilters.length > 0 && (
                    <button
                      onClick={clearContentTypes}
                      className="text-xs text-text-muted hover:text-text-primary transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_FILTERS.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = contentTypeFilters.includes(filter.id);
                    return (
                      <button
                        key={filter.id}
                        onClick={() => toggleContentType(filter.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                          isActive
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>
                {contentTypeFilters.length === 0 && (
                  <p className="text-xs text-text-muted mt-2 italic">All types shown</p>
                )}
              </div>
              <Separator className="bg-border-subtle" />
            </>
          )}

          {/* Sort Options - Card views only */}
          {viewConfig.showContentFilters && (
            <>
              <div>
                <div className="flex items-center gap-2 text-text-muted mb-3">
                  <ArrowUpDown className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase">Sort By</span>
                </div>
                <div className="space-y-0.5">
                  {SORT_OPTIONS.map((option) => {
                    const isActive = sortBy === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (isActive) {
                            toggleSortOrder();
                          } else {
                            setSortBy(option.id);
                          }
                          handleSettingChange();
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors',
                          isActive
                            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                            : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                        )}
                      >
                        <span>{option.label}</span>
                        {isActive && (
                          <span className="text-xs opacity-70">
                            {sortOrder === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator className="bg-border-subtle" />
            </>
          )}

          {/* Quick Filter Section - Card views only */}
          {viewConfig.showContentFilters && (
            <>
              <div>
                <div className="flex items-center gap-2 text-text-muted mb-3">
                  <Inbox className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase">Quick Filter</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {UNSORTED_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = unsortedFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setUnsortedFilter(option.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                          isActive
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                        )}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator className="bg-border-subtle" />
            </>
          )}

          {/* Grouping Section - Card views only */}
          {viewConfig.showContentFilters && (
            <>
              <div>
                <div className="flex items-center gap-2 text-text-muted mb-3">
                  <Layers className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase">Group By</span>
                </div>
                <div className="space-y-3">
                  {/* Group by dropdown */}
                  <div className="flex flex-wrap gap-1.5">
                    {GROUP_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isActive = groupBy === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            setGroupBy(option.id);
                            handleSettingChange();
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                            isActive
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Date grouping options (only when groupBy === 'date') */}
                  {groupBy === 'date' && (
                    <div>
                      <label className="text-xs text-text-secondary mb-2 block">Date Range</label>
                      <div className="grid grid-cols-5 gap-1">
                        {DATE_GROUP_OPTIONS.map((option) => {
                          const isActive = dateGrouping === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                setDateGrouping(option.id);
                                handleSettingChange();
                              }}
                              className={cn(
                                'px-2 py-1.5 text-xs rounded-md transition-colors',
                                isActive
                                  ? 'bg-[var(--color-accent)] text-white'
                                  : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator className="bg-border-subtle" />
            </>
          )}

          {/* Card Display Section - Card views only */}
          {viewConfig.showCardDisplay && (
            <>
              <div>
                <div className="flex items-center gap-2 text-text-muted mb-3">
                  <Sliders className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase">Card Display</span>
                </div>

                <div className="space-y-4">
                  {/* View Dropdown - Always visible */}
                  <div className="group/view relative flex items-center justify-between">
                    <label className="text-xs text-text-secondary">View</label>
                    <button className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary transition-colors">
                      {layout === 'masonry' && <LayoutDashboard className="h-3.5 w-3.5" />}
                      {layout === 'grid' && <LayoutGrid className="h-3.5 w-3.5" />}
                      {layout === 'list' && <List className="h-3.5 w-3.5" />}
                      <span className="capitalize">{layout}</span>
                    </button>
                    {/* Hover dropdown */}
                    <div className="absolute right-0 top-full mt-1 z-50 opacity-0 invisible group-hover/view:opacity-100 group-hover/view:visible transition-all duration-150">
                      <div
                        className="py-1 rounded-lg shadow-lg min-w-[120px]"
                        style={{
                          background: 'var(--color-bg-surface-2)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <button
                          onClick={() => {
                            setLayout('masonry');
                            handleSettingChange();
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                            layout === 'masonry'
                              ? 'text-[var(--color-accent)]'
                              : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                          )}
                        >
                          <LayoutDashboard className="h-3.5 w-3.5" />
                          <span>Masonry</span>
                        </button>
                        <button
                          onClick={() => {
                            setLayout('grid');
                            handleSettingChange();
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                            layout === 'grid'
                              ? 'text-[var(--color-accent)]'
                              : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                          )}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span>Grid</span>
                        </button>
                        <button
                          onClick={() => {
                            setLayout('list');
                            handleSettingChange();
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                            layout === 'list'
                              ? 'text-[var(--color-accent)]'
                              : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                          )}
                        >
                          <List className="h-3.5 w-3.5" />
                          <span>List</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card options - Hidden in List View since they don't apply */}
                  {layout !== 'list' && (
                    <>
                      {/* Card Size */}
                      <div>
                        <label className="text-xs text-text-secondary mb-2 block">Card Size</label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['small', 'medium', 'large', 'xl'] as CardSize[]).map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                setCardSize(size);
                                handleSettingChange();
                              }}
                              className={cn(
                                'px-2 py-1.5 text-xs rounded-md transition-colors capitalize',
                                cardSize === size
                                  ? 'bg-[var(--color-accent)] text-white'
                                  : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                              )}
                            >
                              {size === 'xl' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1, 3)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Card Padding Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-text-secondary">Padding</label>
                          <span className="text-xs text-text-muted">{cardPadding}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={cardPadding}
                          onChange={(e) => {
                            setCardPadding(Number(e.target.value));
                            handleSettingChange();
                          }}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slider"
                          style={{
                            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(cardPadding / 40) * 100}%, var(--bg-surface-3) ${(cardPadding / 40) * 100}%, var(--bg-surface-3) 100%)`,
                          }}
                        />
                      </div>

                      {/* Card Spacing Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-text-secondary">Spacing</label>
                          <span className="text-xs text-text-muted">{cardSpacing}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={cardSpacing}
                          onChange={(e) => {
                            setCardSpacing(Number(e.target.value));
                            handleSettingChange();
                          }}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slider"
                          style={{
                            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(cardSpacing / 40) * 100}%, var(--bg-surface-3) ${(cardSpacing / 40) * 100}%, var(--bg-surface-3) 100%)`,
                          }}
                        />
                      </div>

                      {/* Toggle Switches */}
                      <div className="space-y-2">
                        {/* Show Metadata Footer */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-text-secondary">Metadata Footer</label>
                          <button
                            onClick={() => {
                              setShowMetadataFooter(!showMetadataFooter);
                              handleSettingChange();
                            }}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors',
                              showMetadataFooter ? 'bg-[var(--color-accent)]' : 'bg-bg-surface-3'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                                showMetadataFooter && 'translate-x-4'
                              )}
                            />
                          </button>
                        </div>

                        {/* Show URL Pill */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-text-secondary">URL Pill</label>
                          <button
                            onClick={() => {
                              setShowUrlPill(!showUrlPill);
                              handleSettingChange();
                            }}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors',
                              showUrlPill ? 'bg-[var(--color-accent)]' : 'bg-bg-surface-3'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                                showUrlPill && 'translate-x-4'
                              )}
                            />
                          </button>
                        </div>

                        {/* Show Titles */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-text-secondary">Titles</label>
                          <button
                            onClick={() => {
                              setShowTitles(!showTitles);
                              handleSettingChange();
                            }}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors',
                              showTitles ? 'bg-[var(--color-accent)]' : 'bg-bg-surface-3'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                                showTitles && 'translate-x-4'
                              )}
                            />
                          </button>
                        </div>

                        {/* Show Tags */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-text-secondary">Tags</label>
                          <button
                            onClick={() => {
                              setShowTags(!showTags);
                              handleSettingChange();
                            }}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors',
                              showTags ? 'bg-[var(--color-accent)]' : 'bg-bg-surface-3'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                                showTags && 'translate-x-4'
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Separator className="bg-border-subtle" />
            </>
          )}

          {/* Tags Section - Card views only */}
          {viewConfig.showTags && (
            <div>
              <div className="flex items-center justify-between text-text-muted mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase">Tags</span>
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearTags}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {allTags.length === 0 ? (
                <p className="text-xs text-text-muted italic">No tags yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(({ tag, count }) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'px-2 py-1 text-xs rounded-md transition-colors',
                          isSelected
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                        )}
                      >
                        {tag}
                        <span className="ml-1 opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Home view placeholder */}
          {viewConfig.type === 'home' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Home className="h-10 w-10 text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">Welcome to Pawkit</p>
              <p className="text-xs text-text-muted mt-1">
                View your stats and get started
              </p>
            </div>
          )}

          {/* Calendar view placeholder */}
          {viewConfig.type === 'calendar' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-10 w-10 text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">Calendar Options</p>
              <p className="text-xs text-text-muted mt-1">
                Calendar filters coming soon
              </p>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
