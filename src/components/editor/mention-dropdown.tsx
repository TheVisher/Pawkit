'use client';

/**
 * Mention Dropdown Component
 *
 * Displays autocomplete suggestions for @ mentions.
 * Shows grouped results: dates, recent, notes, bookmarks, Pawkits.
 */

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Calendar, FileText, Link2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMentionSearch, type MentionItem, type MentionSearchResult } from '@/lib/hooks/use-mention-search';

export interface MentionDropdownProps {
  query: string;
  workspaceId: string | undefined;
  onSelect: (item: MentionItem) => void;
  clientRect: (() => DOMRect | null) | null;
}

export interface MentionDropdownRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SectionProps {
  title: string;
  items: MentionItem[];
  selectedIndex: number;
  startIndex: number;
  onSelect: (item: MentionItem) => void;
  onHover: (index: number) => void;
  itemRefs: React.MutableRefObject<Map<number, HTMLButtonElement>>;
}

function getIcon(item: MentionItem) {
  switch (item.type) {
    case 'date':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'pawkit':
      return <FolderOpen className="h-4 w-4 text-purple-500" />;
    case 'card':
      return item.icon === '📄' ? (
        <FileText className="h-4 w-4 text-green-500" />
      ) : (
        <Link2 className="h-4 w-4 text-orange-500" />
      );
    default:
      return null;
  }
}

function MentionSection({
  title,
  items,
  selectedIndex,
  startIndex,
  onSelect,
  onHover,
  itemRefs,
}: SectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
        {title}
      </div>
      {items.map((item, i) => {
        const index = startIndex + i;
        const isSelected = index === selectedIndex;

        return (
          <button
            key={`${item.type}-${item.id}`}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              isSelected
                ? 'bg-accent/10 text-text-primary'
                : 'text-text-secondary hover:bg-bg-surface-2'
            )}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onHover(index)}
          >
            {getIcon(item)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.label}</div>
              {item.subtitle && (
                <div className="text-xs text-text-muted truncate">{item.subtitle}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export const MentionDropdown = forwardRef<MentionDropdownRef, MentionDropdownProps>(
  function MentionDropdown({ query, workspaceId, onSelect, clientRect }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    // Search for mentions
    const results = useMentionSearch(query, workspaceId);

    // Flatten items for keyboard navigation
    const allItems = [
      ...results.dates,
      ...results.recent,
      ...results.notes,
      ...results.bookmarks,
      ...results.pawkits,
    ];

    // Calculate section start indices
    const sectionStarts = {
      dates: 0,
      recent: results.dates.length,
      notes: results.dates.length + results.recent.length,
      bookmarks: results.dates.length + results.recent.length + results.notes.length,
      pawkits:
        results.dates.length +
        results.recent.length +
        results.notes.length +
        results.bookmarks.length,
    };

    // Reset selection when results change
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
      const selectedEl = itemRefs.current.get(selectedIndex);
      if (selectedEl) {
        selectedEl.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }, [selectedIndex]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (event: KeyboardEvent): boolean => {
        if (allItems.length === 0) return false;

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % allItems.length);
            return true;

          case 'ArrowUp':
            event.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
            return true;

          case 'Tab':
            event.preventDefault();
            // Jump to next section
            const nextSectionStarts = Object.values(sectionStarts).sort((a, b) => a - b);
            const currentSectionIndex = nextSectionStarts.findIndex(
              (start, i) => selectedIndex >= start && (i === nextSectionStarts.length - 1 || selectedIndex < nextSectionStarts[i + 1])
            );
            const nextSection = (currentSectionIndex + 1) % nextSectionStarts.length;
            setSelectedIndex(nextSectionStarts[nextSection]);
            return true;

          case 'Enter':
            event.preventDefault();
            if (allItems[selectedIndex]) {
              onSelect(allItems[selectedIndex]);
            }
            return true;

          case 'Escape':
            // Let the editor handle escape
            return false;

          default:
            return false;
        }
      },
      [allItems, selectedIndex, onSelect, sectionStarts]
    );

    // Expose keyboard handler via ref
    useImperativeHandle(ref, () => ({
      onKeyDown: handleKeyDown,
    }));

    // Don't render if no results
    if (results.isEmpty && !results.dates.length && !results.recent.length) {
      return null;
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          'w-72 max-h-80 overflow-y-auto',
          'bg-[var(--glass-panel-bg)] backdrop-blur-xl',
          'border border-[var(--glass-border)] rounded-lg',
          'shadow-[var(--glass-shadow)]',
          'animate-in fade-in-0 zoom-in-95 duration-150'
        )}
      >
        {/* Date shortcuts / parsed date */}
        {results.dates.length > 0 && (
          <MentionSection
            title={query ? 'Date' : 'Dates'}
            items={results.dates}
            selectedIndex={selectedIndex}
            startIndex={sectionStarts.dates}
            onSelect={onSelect}
            onHover={setSelectedIndex}
            itemRefs={itemRefs}
          />
        )}

        {/* Recent items (when query is empty) */}
        {results.recent.length > 0 && (
          <MentionSection
            title="Recent"
            items={results.recent}
            selectedIndex={selectedIndex}
            startIndex={sectionStarts.recent}
            onSelect={onSelect}
            onHover={setSelectedIndex}
            itemRefs={itemRefs}
          />
        )}

        {/* Notes */}
        {results.notes.length > 0 && (
          <MentionSection
            title="Notes"
            items={results.notes}
            selectedIndex={selectedIndex}
            startIndex={sectionStarts.notes}
            onSelect={onSelect}
            onHover={setSelectedIndex}
            itemRefs={itemRefs}
          />
        )}

        {/* Bookmarks */}
        {results.bookmarks.length > 0 && (
          <MentionSection
            title="Bookmarks"
            items={results.bookmarks}
            selectedIndex={selectedIndex}
            startIndex={sectionStarts.bookmarks}
            onSelect={onSelect}
            onHover={setSelectedIndex}
            itemRefs={itemRefs}
          />
        )}

        {/* Pawkits */}
        {results.pawkits.length > 0 && (
          <MentionSection
            title="Pawkits"
            items={results.pawkits}
            selectedIndex={selectedIndex}
            startIndex={sectionStarts.pawkits}
            onSelect={onSelect}
            onHover={setSelectedIndex}
            itemRefs={itemRefs}
          />
        )}

        {/* Empty state */}
        {results.isEmpty && (
          <div className="px-3 py-4 text-center text-sm text-text-muted">
            No matches found
          </div>
        )}

        {/* Keyboard hint */}
        <div className="px-3 py-2 border-t border-border-subtle text-xs text-text-muted flex items-center gap-4">
          <span>↑↓ Navigate</span>
          <span>Tab Section</span>
          <span>↵ Select</span>
        </div>
      </div>
    );
  }
);

export default MentionDropdown;
