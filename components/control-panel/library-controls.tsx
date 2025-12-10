"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Tag, SortAsc, Eye, Maximize2, File, ArrowUpDown, ArrowUp, ArrowDown, Heart, Trash2, Link, FileText, ImageIcon, Music, Video, FileBox, ChevronDown, Check, X, Grid3X3, Grid2X2, Square, RectangleHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { useViewSettingsStore, type SortBy, type ContentType } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRediscoverStore } from "@/lib/hooks/rediscover-store";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useState, useRef, useEffect } from "react";
import { TodosSection } from "./todos-section";

// Map view settings sortBy to control panel sort options
const mapSortByToControl = (sortBy: SortBy): "date" | "modified" | "title" | "domain" => {
  switch (sortBy) {
    case "createdAt":
      return "date";
    case "updatedAt":
      return "modified";
    case "title":
      return "title";
    case "url":
      return "domain";
    default:
      return "modified";
  }
};

const mapControlToSortBy = (sort: "date" | "modified" | "title" | "domain"): SortBy => {
  switch (sort) {
    case "date":
      return "createdAt";
    case "modified":
      return "updatedAt";
    case "title":
      return "title";
    case "domain":
      return "url";
  }
};

// View Dropdown Component
type ViewDropdownProps = {
  layout: "grid" | "masonry" | "list";
  onLayoutChange: (layout: "grid" | "masonry" | "list") => void;
};

const viewOptions = [
  { value: "grid" as const, label: "Grid", icon: Grid },
  { value: "masonry" as const, label: "Masonry", icon: LayoutGrid },
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
        {/* Title */}
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
  sectionId: string;
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
  sectionId,
}: TagsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = pathname === "/tags";
  const isCollapsed = collapsedSections[sectionId];

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
      toggleSection(sectionId);
    }
  };

  return (
    <PanelSection
      id={sectionId}
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
                  boxShadow: 'var(--raised-shadow-sm), 0 0 12px var(--ds-accent-subtle)',
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
                    e.currentTarget.style.boxShadow = 'var(--inset-shadow-sm), 0 0 8px var(--ds-accent-subtle)';
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
        </div>

        {/* Expand/Collapse button - anchored on its own row */}
        {hasMoreTags && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium transition-all duration-200"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {isExpanded ? 'Show less' : `+${hiddenTags.length} more`}
          </button>
        )}

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

export function LibraryControls() {
  const router = useRouter();
  const pathname = usePathname();
  const { cards } = useDataStore();

  // Get Rediscover mode state
  const rediscoverStore = useRediscoverStore();

  // Get collapsed sections for managing section state
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Detect if panel is floating over content (for conditional styling)
  const leftMode = usePanelStore((state) => state.leftMode);
  const panelMode = usePanelStore((state) => state.mode);
  const isPanelOpen = usePanelStore((state) => state.isOpen);
  const isFloatingOverContent = leftMode === "anchored" && panelMode === "floating" && isPanelOpen;

  // Get view settings from store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("library"));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setCardSpacing = useViewSettingsStore((state) => state.setCardSpacing);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowPreview = useViewSettingsStore((state) => state.setShowPreview);
  const setContentTypeFilter = useViewSettingsStore((state) => state.setContentTypeFilter);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);

  // Get global settings
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);

  // Extract current values
  // Fallback: If user had "compact" selected, default to "grid" (compact removed from ViewDropdown)
  const rawLayout = viewSettings.layout;
  const layout: "grid" | "masonry" | "list" = (rawLayout === "grid" || rawLayout === "masonry" || rawLayout === "list") ? rawLayout : "grid";
  const cardSizeValue = viewSettings.cardSize;
  const cardSpacingValue = viewSettings.cardSpacing;
  const cardPaddingValue = viewSettings.cardPadding;
  const showLabelsValue = viewSettings.showLabels;
  const showMetadataValue = viewSettings.showMetadata;
  const showPreviewValue = viewSettings.showPreview;
  const contentTypeFilter = viewSettings.contentTypeFilter;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Extract all unique tags from cards (includes both user tags AND pawkit collections)
  // Exclude cards in private pawkits (cards with 'the-den' or other private collections)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    cards.forEach((card) => {
      // Skip cards in private collections
      const isInPrivateCollection = card.collections?.some(slug =>
        slug === 'the-den'
      );
      if (isInPrivateCollection) return;

      // Add user-defined tags
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }

      // Add pawkit collections as tags (these are also filterable)
      if (card.collections && card.collections.length > 0) {
        card.collections.forEach((collection) => {
          // Skip private collections (like 'the-den')
          if (collection !== 'the-den') {
            tagMap.set(collection, (tagMap.get(collection) || 0) + 1);
          }
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

    setViewSpecific("library", {
      ...viewSettings.viewSpecific,
      selectedTags: newTags,
    });
  };

  const handleClearTags = () => {
    setViewSpecific("library", {
      ...viewSettings.viewSpecific,
      selectedTags: [],
    });
  };

  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout("library", newLayout);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy("library", mapControlToSortBy(newSort));
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize("library", size);
  };

  const handleCardSpacingChange = (spacing: number) => {
    setCardSpacing("library", spacing);
  };

  const handleCardPaddingChange = (padding: number) => {
    setCardPadding("library", padding);
  };

  const handleShowThumbnailsChange = (show: boolean) => {
    setShowThumbnails(show);
  };

  const handleShowLabelsChange = (show: boolean) => {
    setShowLabels("library", show);
  };

  const handleShowMetadataChange = (show: boolean) => {
    setShowMetadata("library", show);
  };

  const handleShowPreviewChange = (show: boolean) => {
    setShowPreview("library", show);
  };

  const handleContentTypeToggle = (type: ContentType) => {
    const currentTypes = contentTypeFilter;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    setContentTypeFilter("library", newTypes);
  };

  const handleClearContentTypes = () => {
    setContentTypeFilter("library", []);
  };

  const handleToggleSortOrder = () => {
    setSortOrder("library", sortOrder === "asc" ? "desc" : "asc");
  };

  // Calculate total actions for stats
  const totalActions = rediscoverStore.stats.kept + rediscoverStore.stats.deleted;

  return (
    <>
      {rediscoverStore.isActive ? (
        // Rediscover Mode: Flexbox layout with scrollable kept cards and fixed stats
        <div className="flex flex-col h-full -my-6">
          {/* Kept Cards Section - Scrollable */}
          <div className="flex-1 overflow-y-auto py-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              Kept Cards
            </h2>

            {rediscoverStore.keptCards.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No cards kept yet
              </div>
            ) : (
              <div className="space-y-3">
                {rediscoverStore.keptCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5">
                      {card.image ? (
                        <Image
                          src={card.image}
                          alt={card.title || "Card"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent/20 to-pink-500/20" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {card.title || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {card.domain || (card.url ? new URL(card.url).hostname : "")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Stats Section - Fixed at bottom */}
          <div className="-mx-4 px-4 py-3 border-t border-white/5 backdrop-blur-md">
            <div className="text-xs text-muted-foreground space-y-2">
              {/* Kept */}
              <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-accent" />
                  <span className="text-accent">Kept</span>
                </div>
                <span className="font-semibold text-accent">{rediscoverStore.stats.kept}</span>
              </div>

              {/* Deleted */}
              {rediscoverStore.stats.deleted > 0 && (
                <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-400">Deleted</span>
                  </div>
                  <span className="font-semibold text-red-400">{rediscoverStore.stats.deleted}</span>
                </div>
              )}

              {/* Total */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span>Total Actions</span>
                  <span className="font-semibold text-foreground">{totalActions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Normal Library Controls
        <>
          {/* Todos Section */}
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
              sectionId="library-tags"
            />
          )}

      {/* Content Type Filter Section */}
      <PanelSection
        id="library-content-type"
        title="Content Type"
        icon={<File className="h-4 w-4 text-accent" />}
        action={contentTypeFilter.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClearContentTypes}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: 'var(--bg-surface-3)',
                  boxShadow: 'var(--shadow-1)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--border-highlight-top)',
                }}
              >
                <X size={14} style={{ color: 'var(--text-primary)' }} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="z-[200]">Clear all filters</TooltipContent>
          </Tooltip>
        ) : undefined}
      >
        {/* Content Type Toggles - Inset Grid */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--bg-surface-1)',
            boxShadow: 'var(--inset-shadow)',
            border: 'var(--inset-border)',
            borderBottomColor: 'var(--inset-border-bottom)',
            borderRightColor: 'var(--inset-border-right)',
          }}
        >
          <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
            {/* Bookmarks - Full Width at Top */}
            <button
              onClick={() => handleContentTypeToggle("url")}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all w-full"
              style={contentTypeFilter.includes("url") ? {
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
              <Link size={14} />
              <span>Bookmarks</span>
            </button>

            {/* 2x3 Grid for remaining types */}
            <div
              className="grid grid-cols-2"
              style={{ gap: 'var(--space-4)' }}
            >
              {/* Column 1 */}
              <button
                onClick={() => handleContentTypeToggle("md-note")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={contentTypeFilter.includes("md-note") ? {
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
                <FileText size={14} />
                <span>Notes</span>
              </button>

              <button
                onClick={() => handleContentTypeToggle("video")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={contentTypeFilter.includes("video") ? {
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
                <Video size={14} />
                <span>Video</span>
              </button>

              <button
                onClick={() => handleContentTypeToggle("image")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={contentTypeFilter.includes("image") ? {
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
                <ImageIcon size={14} />
                <span>Images</span>
              </button>

              <button
                onClick={() => handleContentTypeToggle("document")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={contentTypeFilter.includes("document") ? {
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
                <span>Docs</span>
              </button>

              <button
                onClick={() => handleContentTypeToggle("audio")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={contentTypeFilter.includes("audio") ? {
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
                <Music size={14} />
                <span>Audio</span>
              </button>

              <button
                onClick={() => handleContentTypeToggle("other")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={contentTypeFilter.includes("other") ? {
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
                <FileBox size={14} />
                <span>Other</span>
              </button>
            </div>
          </div>
        </div>
      </PanelSection>

      {/* Sort Section */}
      <PanelSection
        id="library-sort"
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
        <PanelButton
          active={sortBy === "domain"}
          onClick={() => handleSortChange("domain")}
        >
          Domain
        </PanelButton>
      </PanelSection>

      {/* View Section - Inline Dropdown */}
      <ViewDropdown layout={layout} onLayoutChange={handleLayoutChange} />

      {/* Display Options Section */}
      <PanelSection id="library-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
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
      )}
    </>
  );
}
