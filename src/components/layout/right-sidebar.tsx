'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Filter, Tag, ArrowRightToLine, ArrowLeftFromLine, Maximize2, Minimize2, Moon, Sun, SunMoon, Sliders, Home, Calendar, Info, LayoutGrid, List, LayoutDashboard } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRightSidebar } from '@/lib/stores/ui-store';
import { useViewStore, useCardDisplaySettings } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
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
  const pathname = usePathname();
  const { isOpen, isAnchored, toggleAnchored, setOpen } = useRightSidebar();
  const { theme, setTheme } = useTheme();
  const workspace = useCurrentWorkspace();

  // Get view-specific configuration
  const viewConfig = useMemo(() => getViewConfig(displayedPathname || pathname), [displayedPathname, pathname]);

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
  const setLayout = useViewStore((s) => s.setLayout);
  const setCardPadding = useViewStore((s) => s.setCardPadding);
  const setCardSpacing = useViewStore((s) => s.setCardSpacing);
  const setCardSize = useViewStore((s) => s.setCardSize);
  const setShowMetadataFooter = useViewStore((s) => s.setShowMetadataFooter);
  const setShowUrlPill = useViewStore((s) => s.setShowUrlPill);
  const setShowTitles = useViewStore((s) => s.setShowTitles);
  const setShowTags = useViewStore((s) => s.setShowTags);
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);

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
              <TooltipContent side="bottom">
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
              <TooltipContent side="bottom">
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
              <TooltipContent side="bottom">
                <p>{themeInfo.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-text-secondary">{viewConfig.title}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div
          key={displayedPathname}
          className={cn(
            'space-y-4 transition-all ease-out',
            isAnimating
              ? 'opacity-0 translate-y-2'
              : 'opacity-100 translate-y-0'
          )}
          style={{ transitionDuration: '250ms' }}
        >
          {/* Content Type Filter - Card views only */}
          {viewConfig.showContentFilters && (
            <>
              <div>
                <div className="flex items-center gap-2 text-text-muted mb-3">
                  <Filter className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase">Content Type</span>
                </div>
                <div className="space-y-1">
                  {['All', 'Bookmarks', 'Notes', 'Files'].map((filter) => (
                    <button
                      key={filter}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors',
                        filter === 'All'
                          ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                          : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                      )}
                    >
                      {filter}
                    </button>
                  ))}
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
              <div className="flex items-center gap-2 text-text-muted mb-3">
                <Tag className="h-5 w-5" />
                <span className="text-xs font-medium uppercase">Tags</span>
              </div>
              <p className="text-xs text-text-muted italic">No tags yet</p>
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
      </div>
    </div>
  );
}
