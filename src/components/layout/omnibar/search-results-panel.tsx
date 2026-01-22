'use client';

import { FileText, Globe, Hash, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResults } from './types';

interface SearchResultsPanelProps {
  searchResults: SearchResults;
  selectedIndex: number;
  onSelectResult: (index: number) => void;
  showEmptyState: boolean;
}

export function SearchResultsPanel({
  searchResults,
  selectedIndex,
  onSelectResult,
  showEmptyState,
}: SearchResultsPanelProps) {
  // Calculate index offsets for each section
  const getGlobalIndex = (section: 'cards' | 'collections' | 'tags' | 'actions', localIndex: number): number => {
    let offset = 0;
    if (section === 'cards') return offset + localIndex;
    offset += searchResults.cards.length;
    if (section === 'collections') return offset + localIndex;
    offset += searchResults.collections.length;
    if (section === 'tags') return offset + localIndex;
    offset += searchResults.tags?.length || 0;
    if (section === 'actions') return offset + localIndex;
    return -1;
  };

  const isSelected = (section: 'cards' | 'collections' | 'tags' | 'actions', localIndex: number): boolean => {
    return getGlobalIndex(section, localIndex) === selectedIndex;
  };

  return (
    <div
      className={cn(
        'mt-2 border-t border-[var(--glass-border)] pt-2',
        showEmptyState
          ? 'overflow-hidden'
          : 'flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]'
      )}
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Cards Section */}
      {searchResults.cards.length > 0 && (
        <div className={cn('mb-2', showEmptyState && 'mb-0')}>
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            {showEmptyState ? 'Recent' : 'Cards'}
          </div>
          {searchResults.cards.map((card, idx) => (
            <button
              key={card._id}
              onClick={() => onSelectResult(getGlobalIndex('cards', idx))}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-left',
                'transition-colors duration-100',
                isSelected('cards', idx)
                  ? 'bg-[var(--color-accent)]/20 text-text-primary'
                  : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
              )}
            >
              {card.type === 'url' ? (
                <Globe className="h-4 w-4 shrink-0 text-text-muted" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">{card.title || 'Untitled'}</div>
                {card.omnibarSnippet ? (
                  card.omnibarSnippet.hasMatch ? (
                    <div className="text-xs text-text-muted truncate">
                      {card.omnibarSnippet.hasPrefix ? '...' : ''}
                      {card.omnibarSnippet.text.slice(0, card.omnibarSnippet.matchStart)}
                      <span className="text-[var(--color-accent)]">
                        {card.omnibarSnippet.text.slice(
                          card.omnibarSnippet.matchStart,
                          card.omnibarSnippet.matchStart + card.omnibarSnippet.matchLength
                        )}
                      </span>
                      {card.omnibarSnippet.text.slice(
                        card.omnibarSnippet.matchStart + card.omnibarSnippet.matchLength
                      )}
                      {card.omnibarSnippet.hasSuffix ? '...' : ''}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted truncate">
                      {card.omnibarSnippet.text}
                    </div>
                  )
                ) : card.domain ? (
                  <div className="text-xs text-text-muted truncate">{card.domain}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Collections Section */}
      {searchResults.collections.length > 0 && (
        <div className="mb-2">
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Pawkits
          </div>
          {searchResults.collections.map((col, idx) => (
            <button
              key={col._id}
              onClick={() => onSelectResult(getGlobalIndex('collections', idx))}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-left',
                'transition-colors duration-100',
                isSelected('collections', idx)
                  ? 'bg-[var(--color-accent)]/20 text-text-primary'
                  : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
              )}
            >
              <Folder className="h-4 w-4 shrink-0 text-text-muted" />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">{col.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tags Section */}
      {searchResults.tags && searchResults.tags.length > 0 && (
        <div className="mb-2">
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Tags
          </div>
          {searchResults.tags.map((tag, idx) => (
            <button
              key={tag}
              onClick={() => onSelectResult(getGlobalIndex('tags', idx))}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-left',
                'transition-colors duration-100',
                isSelected('tags', idx)
                  ? 'bg-[var(--color-accent)]/20 text-text-primary'
                  : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
              )}
            >
              <Hash className="h-4 w-4 shrink-0 text-text-muted" />
              <div className="truncate text-sm">{tag}</div>
            </button>
          ))}
        </div>
      )}

      {/* Actions Section */}
      {searchResults.actions.length > 0 && (
        <div className="mb-2">
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Actions
          </div>
          {searchResults.actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onSelectResult(getGlobalIndex('actions', idx))}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-left',
                  'transition-colors duration-100',
                  isSelected('actions', idx)
                    ? 'bg-[var(--color-accent)]/20 text-text-primary'
                    : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{action.label}</div>
                </div>
                {action.shortcut && (
                  <kbd className="text-xs text-text-muted shrink-0">{action.shortcut}</kbd>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tips row moved to idle content */}
    </div>
  );
}
