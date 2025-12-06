"use client";

import { PanelSection, PanelButton } from "./control-panel";
import { Grid, List, Tag, SortAsc, Eye, Maximize2, ArrowUp, ArrowDown, ChevronDown, Check, Grid3X3, Grid2X2, LayoutGrid, Square, File, Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewSettingsStore, type SortBy } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useState, useRef, useEffect } from "react";
import { TodosSection } from "./todos-section";

// Map view settings sortBy to control panel sort options
const mapSortByToControl = (sortBy: SortBy): "date" | "modified" | "title" => {
  switch (sortBy) {
    case "createdAt":
      return "date";
    case "updatedAt":
      return "modified";
    case "title":
      return "title";
    default:
      return "modified";
  }
};

const mapControlToSortBy = (sort: "date" | "modified" | "title"): SortBy => {
  switch (sort) {
    case "date":
      return "createdAt";
    case "modified":
      return "updatedAt";
    case "title":
      return "title";
  }
};

// Theme Toggle Component
function ThemeToggle() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark" || (theme === "auto" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg transition-all"
          style={{
            background: 'var(--bg-surface-3)',
            boxShadow: 'var(--shadow-1)',
            border: '1px solid var(--border-subtle)',
            borderTopColor: 'var(--border-highlight-top)',
          }}
        >
          {isDark ? (
            <Moon size={12} style={{ color: 'var(--text-primary)' }} />
          ) : (
            <Sun size={12} style={{ color: 'var(--text-primary)' }} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="z-[200]">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </TooltipContent>
    </Tooltip>
  );
}

// View Dropdown Component - Notes version (Grid/List only)
type ViewDropdownProps = {
  layout: "grid" | "list";
  onLayoutChange: (layout: "grid" | "list") => void;
};

const viewOptions = [
  { value: "grid" as const, label: "Grid", icon: Grid },
  { value: "list" as const, label: "List", icon: List },
];

function ViewDropdown({ layout, onLayoutChange }: ViewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay before closing to allow moving to menu
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const currentOption = viewOptions.find(opt => opt.value === layout) || viewOptions[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div
      ref={dropdownRef}
      className="rounded-xl p-4"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)'
      }}
    >
      <div className="flex items-center justify-between">
        {/* Title and Theme Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <Eye className="h-4 w-4 text-accent" />
            <span
              className="font-semibold uppercase tracking-wide"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '0.5px',
                fontSize: '0.8125rem',
              }}
            >
              View
            </span>
          </div>
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>

        {/* Dropdown Button */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              background: 'var(--bg-surface-3)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <CurrentIcon size={14} />
            <span>{currentOption.label}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-muted)' }}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div
              className="absolute right-0 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: 'var(--bg-surface-3)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                minWidth: '140px',
              }}
            >
              {viewOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = layout === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onLayoutChange(option.value);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
                    style={{
                      background: isSelected ? 'var(--bg-surface-2)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--bg-surface-2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={14} />
                    <span className="flex-1 text-left">{option.label}</span>
                    {isSelected && <Check size={14} className="text-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Card Size Selector - segmented control with sliding indicator
const cardSizeOptions = [
  { value: 20, label: 'S', icon: Grid3X3 },
  { value: 45, label: 'M', icon: Grid2X2 },
  { value: 70, label: 'L', icon: LayoutGrid },
  { value: 100, label: 'XL', icon: Square },
];

type CardSizeSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

function CardSizeSelector({ value, onChange }: CardSizeSelectorProps) {
  // Find the closest size option
  const getClosestIndex = (val: number) => {
    let closestIdx = 0;
    let minDiff = Math.abs(cardSizeOptions[0].value - val);
    cardSizeOptions.forEach((opt, idx) => {
      const diff = Math.abs(opt.value - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  };

  const selectedIndex = getClosestIndex(value);
  const numOptions = cardSizeOptions.length;

  return (
    <div
      className="relative rounded-full"
      style={{
        background: 'var(--bg-surface-1)',
        boxShadow: 'var(--slider-inset)',
        border: 'var(--inset-border)',
        borderBottomColor: 'var(--slider-inset-border-bottom)',
        padding: '4px',
      }}
    >
      {/* Sliding indicator */}
      <div
        className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none"
        style={{
          width: `calc((100% - 8px) / ${numOptions})`,
          height: 'calc(100% - 8px)',
          top: '4px',
          left: `calc(4px + (${selectedIndex} * ((100% - 8px) / ${numOptions})))`,
          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
          boxShadow: 'var(--raised-shadow-sm)',
          border: '1px solid transparent',
          borderTopColor: 'var(--raised-border-top)',
        }}
      />
      {/* Buttons */}
      <div className="relative flex">
        {cardSizeOptions.map((option, index) => {
          const Icon = option.icon;
          const isSelected = index === selectedIndex;
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(option.value)}
                  className="flex-1 flex items-center justify-center py-2 rounded-full transition-colors duration-200 z-10"
                  style={{
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <Icon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[200]">{option.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// Tags Section - Option 3: Inline chips with "+X more" expansion
type TagsSectionProps = {
  allTags: { name: string; count: number }[];
  selectedTags: string[];
  onTagToggle: (tagName: string) => void;
  onClearTags: () => void;
  pathname: string;
  onNavigate: () => void;
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
};

const VISIBLE_TAGS_COUNT = 4; // Number of tags to show before "+X more"

function TagsSection({
  allTags,
  selectedTags,
  onTagToggle,
  onClearTags,
  pathname,
  onNavigate,
  collapsedSections,
  toggleSection,
}: TagsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = pathname === "/tags";
  const isCollapsed = collapsedSections["notes-tags"];

  // Split tags into visible and hidden
  const visibleTags = allTags.slice(0, VISIBLE_TAGS_COUNT);
  const hiddenTags = allTags.slice(VISIBLE_TAGS_COUNT);
  const hasMoreTags = hiddenTags.length > 0;

  // Show all tags when expanded, otherwise just visible ones
  const displayedTags = isExpanded ? allTags : visibleTags;

  const handleHeaderClick = () => {
    onNavigate();
    // Ensure section is expanded when clicking header
    if (isCollapsed) {
      toggleSection("notes-tags");
    }
  };

  return (
    <PanelSection
      id="notes-tags"
      title="Tags"
      icon={<Tag className={`h-4 w-4 ${isActive ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
      active={isActive}
      onClick={handleHeaderClick}
    >
      <div className="space-y-2">
        {/* Tags flow container */}
        <div className="flex flex-wrap gap-1.5">
          {displayedTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            return (
              <button
                key={tag.name}
                onClick={() => onTagToggle(tag.name)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200"
                style={isSelected ? {
                  background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                  boxShadow: 'var(--raised-shadow-sm), 0 0 12px rgba(168, 85, 247, 0.3)',
                  border: '1px solid var(--ds-accent)',
                  borderTopColor: 'var(--raised-border-top)',
                  color: 'var(--ds-accent)',
                } : {
                  background: 'var(--bg-surface-1)',
                  boxShadow: 'var(--inset-shadow-sm)',
                  border: 'var(--inset-border)',
                  borderBottomColor: 'var(--inset-border-bottom)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--ds-accent)';
                    e.currentTarget.style.boxShadow = 'var(--inset-shadow-sm), 0 0 8px rgba(168, 85, 247, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.boxShadow = 'var(--inset-shadow-sm)';
                  }
                }}
              >
                #{tag.name}
                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                  {tag.count}
                </span>
              </button>
            );
          })}

          {/* "+X more" expansion chip */}
          {hasMoreTags && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                border: '1px solid var(--border-subtle)',
                borderTopColor: 'var(--raised-border-top)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              +{hiddenTags.length} more
            </button>
          )}

          {/* "Show less" chip when expanded */}
          {isExpanded && hasMoreTags && (
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                border: '1px solid var(--border-subtle)',
                borderTopColor: 'var(--raised-border-top)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              Show less
            </button>
          )}
        </div>

        {/* Clear all button */}
        {selectedTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="text-xs transition-colors"
            style={{ color: 'var(--ds-accent)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Clear all ({selectedTags.length})
          </button>
        )}
      </div>
    </PanelSection>
  );
}

// Custom Inset Slider with popup value display
type InsetSliderProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  unit: string;
};

function InsetSlider({ value, onChange, min, max, label, unit }: InsetSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setShowPopup(true);
    updateValue(e);
  };

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const newValue = Math.round(min + percent * (max - min));
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValue(e);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setShowPopup(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={sliderRef}
          className="relative h-5 rounded-full cursor-pointer"
          style={{
            background: 'var(--bg-surface-1)',
            boxShadow: 'var(--slider-inset)',
            border: 'var(--inset-border)',
            borderBottomColor: 'var(--slider-inset-border-bottom)',
            padding: '4px',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Progress bar */}
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percentage}%`,
              minWidth: percentage > 0 ? '8px' : '0',
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow-sm)',
              border: '1px solid transparent',
              borderTopColor: 'var(--raised-border-top)',
            }}
          />
          {/* Value popup on drag */}
          {showPopup && (
            <div
              className="absolute -top-8 transform -translate-x-1/2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap z-50"
              style={{
                left: `${percentage}%`,
                background: 'var(--bg-surface-3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {Math.round(value)}{unit}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-[200]">{label}</TooltipContent>
    </Tooltip>
  );
}

export function NotesControls() {
  const router = useRouter();
  const pathname = usePathname();
  const { cards } = useDataStore();

  // Get collapsed sections for managing section state
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Get view settings from store - using "notes" key
  const viewSettings = useViewSettingsStore((state) => state.getSettings("notes"));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setCardSpacing = useViewSettingsStore((state) => state.setCardSpacing);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowPreview = useViewSettingsStore((state) => state.setShowPreview);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);

  // Get global settings for thumbnails
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);

  // Extract current values
  // Fallback: If user had "compact" or "masonry" selected, default to "grid"
  const rawLayout = viewSettings.layout;
  const layout: "grid" | "list" = (rawLayout === "grid" || rawLayout === "list") ? rawLayout : "grid";
  const cardSizeValue = viewSettings.cardSize;
  const cardSpacingValue = viewSettings.cardSpacing;
  const cardPaddingValue = viewSettings.cardPadding;
  const showLabelsValue = viewSettings.showLabels;
  const showMetadataValue = viewSettings.showMetadata;
  const showPreviewValue = viewSettings.showPreview;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Extract all unique tags from NOTES only (md-note or text-note)
  // Exclude cards in private pawkits (inDen: true)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    cards.forEach((card) => {
      // Skip cards in private collections
      if (card.collections?.includes('the-den')) return;

      // Only count tags from notes
      if ((card.type === 'md-note' || card.type === 'text-note') && card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cards]);

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];

    setViewSpecific("notes", {
      ...viewSettings.viewSpecific,
      selectedTags: newTags,
    });
  };

  const handleClearTags = () => {
    setViewSpecific("notes", {
      ...viewSettings.viewSpecific,
      selectedTags: [],
    });
  };

  const handleLayoutChange = (newLayout: "grid" | "list") => {
    setLayout("notes", newLayout);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy("notes", mapControlToSortBy(newSort));
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize("notes", size);
  };

  const handleCardSpacingChange = (spacing: number) => {
    setCardSpacing("notes", spacing);
  };

  const handleCardPaddingChange = (padding: number) => {
    setCardPadding("notes", padding);
  };

  const handleShowThumbnailsChange = (show: boolean) => {
    setShowThumbnails(show);
  };

  const handleShowLabelsChange = (show: boolean) => {
    setShowLabels("notes", show);
  };

  const handleShowMetadataChange = (show: boolean) => {
    setShowMetadata("notes", show);
  };

  const handleShowPreviewChange = (show: boolean) => {
    setShowPreview("notes", show);
  };

  const handleToggleSortOrder = () => {
    setSortOrder("notes", sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Tags Filter Section - Option 3: Inline chips with expansion */}
      {allTags.length > 0 && (
        <TagsSection
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearTags={handleClearTags}
          pathname={pathname}
          onNavigate={() => router.push("/tags")}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
        />
      )}

      {/* Sort Section */}
      <PanelSection
        id="notes-sort"
        title="Sort"
        icon={<SortAsc className="h-4 w-4 text-accent" />}
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleToggleSortOrder}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: 'var(--bg-surface-3)',
                  boxShadow: 'var(--shadow-1)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: sortOrder === "asc" ? 'var(--ds-accent)' : 'var(--border-highlight-top)',
                  borderTopWidth: sortOrder === "asc" ? '3px' : '1px',
                  borderBottomColor: sortOrder === "desc" ? 'var(--ds-accent)' : 'var(--border-subtle)',
                  borderBottomWidth: sortOrder === "desc" ? '3px' : '1px',
                }}
              >
                {sortOrder === "asc" ? (
                  <ArrowUp size={14} style={{ color: 'var(--text-primary)' }} />
                ) : (
                  <ArrowDown size={14} style={{ color: 'var(--text-primary)' }} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="z-[200]">
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </TooltipContent>
          </Tooltip>
        }
      >
        <PanelButton
          active={sortBy === "modified"}
          onClick={() => handleSortChange("modified")}
        >
          Recently Modified
        </PanelButton>
        <PanelButton
          active={sortBy === "date"}
          onClick={() => handleSortChange("date")}
        >
          Date Added
        </PanelButton>
        <PanelButton
          active={sortBy === "title"}
          onClick={() => handleSortChange("title")}
        >
          Title A-Z
        </PanelButton>
      </PanelSection>

      {/* View Section - Inline Dropdown */}
      <ViewDropdown layout={layout} onLayoutChange={handleLayoutChange} />

      {/* Display Options Section */}
      <PanelSection id="notes-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
        {/* Card Size Selector - segmented pill control */}
        <CardSizeSelector value={cardSizeValue} onChange={handleCardSizeChange} />

        {/* Card Spacing Slider */}
        <InsetSlider
          value={cardSpacingValue}
          onChange={handleCardSpacingChange}
          min={1}
          max={64}
          label="Card Spacing"
          unit="px"
        />

        {/* Card Padding Slider */}
        <InsetSlider
          value={cardPaddingValue}
          onChange={handleCardPaddingChange}
          min={0}
          max={100}
          label="Card Padding"
          unit="%"
        />

        {/* Display Toggles - 2x2 Inset Grid */}
        <div
          className="rounded-xl p-4 mt-2"
          style={{
            background: 'var(--bg-surface-1)',
            boxShadow: 'var(--inset-shadow)',
            border: 'var(--inset-border)',
            borderBottomColor: 'var(--inset-border-bottom)',
            borderRightColor: 'var(--inset-border-right)',
          }}
        >
          <div
            className="grid grid-cols-2"
            style={{ gap: 'var(--space-4)' }}
          >
            {/* Thumbnails Toggle */}
            <button
              onClick={() => handleShowThumbnailsChange(!showThumbnails)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={showThumbnails ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                border: '1px solid transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              <Eye size={14} />
              <span>Thumbnails</span>
            </button>

            {/* Labels Toggle */}
            <button
              onClick={() => handleShowLabelsChange(!showLabelsValue)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={showLabelsValue ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                border: '1px solid transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              <Tag size={14} />
              <span>Labels</span>
            </button>

            {/* Metadata Toggle */}
            <button
              onClick={() => handleShowMetadataChange(!showMetadataValue)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={showMetadataValue ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                border: '1px solid transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              <File size={14} />
              <span>Metadata</span>
            </button>

            {/* Preview Toggle */}
            <button
              onClick={() => handleShowPreviewChange(!showPreviewValue)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={showPreviewValue ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                border: '1px solid transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              <Maximize2 size={14} />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </PanelSection>
    </>
  );
}
