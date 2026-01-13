'use client';

/**
 * Supertag Selector
 * Dropdown to convert a note into a supertag note
 */

import { useState, useMemo } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllSupertags, type SupertagDefinition } from '@/lib/tags/supertags';

interface SupertagSelectorProps {
  currentTags: string[];
  onSelectSupertag: (tag: string) => void;
}

// Map supertag icons to lucide icons
const SUPERTAG_ICONS: Record<string, string> = {
  'check': '✓',
  'user': '👤',
  'credit-card': '💳',
  'utensils': '🍳',
  'book-open': '📖',
  'clipboard-list': '📋',
  'calendar': '📅',
  'repeat': '🔄',
  'gift': '🎁',
  'shield': '🛡️',
};

export function SupertagSelector({ currentTags, onSelectSupertag }: SupertagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allSupertags = useMemo(() => getAllSupertags(), []);

  // Find the currently active supertag (only one can be active at a time)
  const activeSupertag = useMemo(() => {
    for (const tag of currentTags) {
      const normalized = tag.toLowerCase();
      const found = allSupertags.find((st) => st.tag === normalized);
      if (found) return found.tag;
    }
    return null;
  }, [currentTags, allSupertags]);

  // Filter to only supertags with templates
  const availableSupertags = useMemo(() => {
    return allSupertags.filter((st) => st.template);
  }, [allSupertags]);

  const handleSelect = (supertag: SupertagDefinition) => {
    // Allow switching to any supertag except the currently active one
    if (supertag.tag !== activeSupertag) {
      onSelectSupertag(supertag.tag);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md',
          'bg-bg-surface-2 border border-border-subtle',
          'hover:bg-bg-surface-3 transition-colors'
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
          <span className="text-text-secondary">Convert to Supertag...</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 py-1 rounded-md bg-bg-surface-2 border border-border-subtle shadow-lg max-h-64 overflow-y-auto">
          {availableSupertags.map((supertag) => {
            const isActive = supertag.tag === activeSupertag;
            const icon = SUPERTAG_ICONS[supertag.icon] || '📄';

            return (
              <button
                key={supertag.tag}
                onClick={() => handleSelect(supertag)}
                disabled={isActive}
                className={cn(
                  'w-full px-3 py-2 text-left transition-colors flex items-center gap-3',
                  isActive
                    ? 'bg-[var(--color-accent)]/10 cursor-default'
                    : 'hover:bg-bg-surface-3'
                )}
              >
                <span className="text-base">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-text-primary">{supertag.displayName}</div>
                  <div className="text-xs text-text-muted truncate">{supertag.description}</div>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
