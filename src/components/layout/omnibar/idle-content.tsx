'use client';

import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MessageCircle,
  MessageSquare,
  Hash,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addMenuItems, type SearchResults } from './types';
import { SearchResultsPanel } from './search-results-panel';

// =============================================================================
// IDLE CONTENT (Search/Actions)
// =============================================================================

interface IdleContentProps {
  isCompact: boolean;
  isAddMenuOpen: boolean;
  setIsAddMenuOpen: (open: boolean) => void;
  onSearchClick: () => void;
  onAddAction: (action: string) => void;
  isQuickNoteMode: boolean;
  setIsQuickNoteMode: (open: boolean) => void;
  quickNoteText: string;
  setQuickNoteText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onQuickNoteKeyDown: (e: React.KeyboardEvent) => void;
  onQuickNoteBlur: (e: React.FocusEvent) => void;
  onSaveQuickNote: () => void;
  onForceExpand: () => void;
  searchResults: SearchResults | null;
  selectedIndex: number;
  onSelectResult: (index: number) => void;
  // Add Mode Props
  isAddMode: boolean;
  addModeSelectedIndex: number;
  onToggleAddMode: () => void;
  onAddModeAction: (action: string) => void;
  // Kit Mode Props
  isKitMode: boolean;
  kitModeSelectedIndex: number;
  kitMenuItems: Array<{ id: string; label: string; icon: string }>;
  onToggleKitMode: () => void;
  onKitModeAction: (actionId: string) => void;
  // Context awareness
  isOnTagsPage?: boolean;
}

export function IdleContent({
  isCompact,
  isAddMenuOpen,
  setIsAddMenuOpen,
  onSearchClick,
  onAddAction,
  isQuickNoteMode,
  setIsQuickNoteMode,
  quickNoteText,
  setQuickNoteText,
  textareaRef,
  onQuickNoteKeyDown,
  onQuickNoteBlur,
  onSaveQuickNote,
  onForceExpand,
  searchResults,
  selectedIndex,
  onSelectResult,
  // Add Mode Props
  isAddMode,
  addModeSelectedIndex,
  onToggleAddMode,
  onAddModeAction,
  // Kit Mode Props
  isKitMode,
  kitModeSelectedIndex,
  kitMenuItems,
  onToggleKitMode,
  onKitModeAction,
  // Context awareness
  isOnTagsPage = false,
}: IdleContentProps) {
  const hasContent = quickNoteText.length > 0;
  const isPrefixCommand = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');

  // On tags page, show "Filtering tags..." instead of search results
  const isFilteringTags = isOnTagsPage && hasContent && !isPrefixCommand;

  // Check if search results are showing
  const hasSearchResults = searchResults && !isFilteringTags && (
    searchResults.cards.length > 0 ||
    searchResults.collections.length > 0 ||
    (searchResults.tags?.length || 0) > 0 ||
    searchResults.actions.length > 0
  );
  const showEmptyState = !!(isQuickNoteMode && !hasContent && searchResults && searchResults.cards.length > 0);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col w-full h-full px-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
    >
      {/* Top Row: Plus Button + Content + Search + Chat */}
      {/* All buttons stay in DOM, flex layout handles positioning */}
      <div className="flex w-full shrink-0 items-center pt-1 h-10">
        {/* Plus Button - Toggle Add Mode */}
        <button
          onClick={onToggleAddMode}
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-10 h-10 rounded-xl',
            'text-text-muted hover:text-text-primary',
            'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
            'transition-all duration-150',
            isAddMode && 'bg-[var(--glass-bg)] text-text-primary rotate-45'
          )}
        >
          <Plus className="h-5 w-5 transition-transform duration-200" />
        </button>

        {/* Middle content - expands/collapses with flex */}
        <div
          className={cn(
            "flex items-center transition-all duration-300 ease-out overflow-hidden",
            isCompact && !isQuickNoteMode
              ? "flex-0 w-0 opacity-0"
              : "flex-1 min-w-0 opacity-100"
          )}
        >
          <div className="flex-1 min-w-0 flex items-center h-10 px-2 gap-2 rounded-xl hover:bg-[var(--glass-bg)] transition-colors duration-150 cursor-text">
            <Search className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              type="text"
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              onKeyDown={onQuickNoteKeyDown}
              onBlur={onQuickNoteBlur}
              placeholder={isOnTagsPage ? "Filter tags..." : "Search or quick note..."}
              className="flex-1 bg-transparent text-sm text-text-muted placeholder:text-text-muted focus:outline-none"
              onFocus={() => setIsQuickNoteMode(true)}
            />
          </div>
        </div>

        {/* Search Button - always visible */}
        <motion.button
          layout
          onClick={onForceExpand}
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-10 h-10 rounded-xl',
            'text-text-muted hover:text-text-primary',
            'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
            'transition-colors duration-150'
          )}
          title="Search (⌘K)"
        >
          <Search className="h-5 w-5" />
        </motion.button>

        {/* Kit Chat Button - always visible */}
        <motion.button
          layout
          onClick={onToggleKitMode}
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-10 h-10 rounded-xl',
            'text-text-muted hover:text-text-primary',
            'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
            'transition-colors duration-150',
            isKitMode && 'bg-[var(--glass-bg)] text-[var(--color-accent)]'
          )}
          title="Kit AI Chat"
        >
          <MessageCircle className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Tags Page Filter Indicator */}
      {isQuickNoteMode && isFilteringTags && (
        <div className="flex items-center gap-2 px-3 py-2 mt-1 border-t border-[var(--glass-border)]">
          <Hash className="h-4 w-4 text-[var(--color-accent)]" />
          <span className="text-sm text-text-muted">Filtering tags...</span>
        </div>
      )}

      {/* Search Results - Full Width */}
      {isQuickNoteMode && hasSearchResults && searchResults && (
        <SearchResultsPanel
          searchResults={searchResults}
          selectedIndex={selectedIndex}
          onSelectResult={onSelectResult}
          showEmptyState={showEmptyState}
        />
      )}

      {/* =================================================================== */}
      {/* ADD MODE PANEL - Expandable menu for adding items                  */}
      {/* =================================================================== */}
      {isAddMode && (
        <div className="flex-1 overflow-y-auto mt-2 border-t border-[var(--glass-border)] pt-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]" style={{ scrollbarWidth: 'none' }}>
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Create New
          </div>
          {addMenuItems.map((item, idx) => (
            <button
              key={item.action}
              onClick={() => onAddModeAction(item.action)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-left',
                'transition-colors duration-100',
                addModeSelectedIndex === idx
                  ? 'bg-[var(--color-accent)]/20 text-text-primary'
                  : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="flex-1 text-sm">{item.label}</span>
              {item.shortcut && (
                <kbd className="text-xs text-text-muted shrink-0">{item.shortcut}</kbd>
              )}
            </button>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* KIT MODE PANEL - AI Chat menu                                       */}
      {/* =================================================================== */}
      {isKitMode && (
        <div className="flex-1 overflow-y-auto mt-2 border-t border-[var(--glass-border)] pt-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]" style={{ scrollbarWidth: 'none' }}>
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Kit AI
          </div>
          {kitMenuItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onKitModeAction(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg text-left',
                'transition-colors duration-100',
                kitModeSelectedIndex === idx
                  ? 'bg-[var(--color-accent)]/20 text-text-primary'
                  : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
              )}
            >
              {item.icon === 'plus' ? (
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
              ) : (
                <MessageSquare className="h-4 w-4 shrink-0 text-text-muted" />
              )}
              <span className={cn(
                'flex-1 text-sm truncate',
                item.icon === 'plus' && 'font-medium'
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// EXPANDED CONTENT (Full search bar)
// =============================================================================

interface ExpandedContentProps {
  onSearchClick: () => void;
  isQuickNoteMode: boolean;
  setIsQuickNoteMode: (open: boolean) => void;
  quickNoteText: string;
  setQuickNoteText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onQuickNoteKeyDown: (e: React.KeyboardEvent) => void;
  onQuickNoteBlur: (e: React.FocusEvent) => void;
  onSaveQuickNote: () => void;
  // Kit Mode
  isKitMode: boolean;
  onToggleKitMode: () => void;
  // Context awareness
  isOnTagsPage?: boolean;
}

function ExpandedContent({
  isQuickNoteMode,
  setIsQuickNoteMode,
  quickNoteText,
  setQuickNoteText,
  textareaRef,
  onQuickNoteKeyDown,
  onQuickNoteBlur,
  onSaveQuickNote,
  isKitMode,
  onToggleKitMode,
  isOnTagsPage = false,
}: ExpandedContentProps) {
  const hasContent = quickNoteText.length > 0;
  const isSearchMode = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');
  // Don't show quick note hints on tags page - we're filtering, not creating a note
  const showHints = hasContent && !isSearchMode && !isOnTagsPage;

  return (
    <div
      className={cn(
        "flex flex-1 min-w-0",
        hasContent ? "items-start" : "items-center h-10"
      )}
    >
      {/* Input Area */}
      <div className={cn(
        "flex-1 min-w-0 flex",
        hasContent
          ? "flex-col pt-1.5 pb-1 pr-2"
          : "items-center h-10 px-3 gap-2 rounded-xl hover:bg-[var(--glass-bg)] transition-colors duration-150 cursor-text"
      )}>
        {/* Icon - only show when no content */}
        {!hasContent && <Search className="h-4 w-4 shrink-0 text-text-muted" />}

        <textarea
          ref={textareaRef}
          value={quickNoteText}
          onChange={(e) => setQuickNoteText(e.target.value)}
          onKeyDown={onQuickNoteKeyDown}
          onBlur={onQuickNoteBlur}
          placeholder={isOnTagsPage ? "Filter tags..." : "Search or quick note..."}
          className={cn(
            'bg-transparent text-sm resize-none',
            'placeholder:text-text-muted',
            'focus:outline-none',
            'scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]',
            hasContent
              ? 'w-full text-text-primary min-h-[28px] leading-snug'
              : 'flex-1 text-text-muted leading-[40px] py-0'
          )}
          style={{ scrollbarWidth: 'none', verticalAlign: 'middle' }}
          rows={1}
          onFocus={() => setIsQuickNoteMode(true)}
        />

        {/* Hints - only show for quick notes (not search) */}
        {showHints && (
          <div
            className="flex items-center justify-between mt-1.5 pt-1.5 text-xs border-t border-[var(--glass-border)]"
            style={{
              background: 'linear-gradient(to top, var(--glass-panel-bg) 0%, transparent 100%)',
            }}
          >
            <span className="text-text-muted">⏎ save · ⇧⏎ new line · esc cancel</span>
            <button
              onClick={onSaveQuickNote}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] ml-2 font-medium"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Kit Chat Button - only show when no content */}
      {!hasContent && (
        <button
          onClick={onToggleKitMode}
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-10 h-10 rounded-xl',
            'text-text-muted hover:text-text-primary',
            'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
            'transition-all duration-150',
            isKitMode && 'bg-[var(--glass-bg)] text-[var(--color-accent)]'
          )}
          title="Kit AI Chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT BUTTONS (Icon only)
// =============================================================================

interface CompactButtonsProps {
  onSearchClick: () => void;
  onForceExpand: () => void;
  isKitMode: boolean;
  onToggleKitMode: () => void;
}

function CompactButtons({ onForceExpand, isKitMode, onToggleKitMode }: CompactButtonsProps) {
  return (
    <div className="flex items-center justify-center flex-1 h-10 gap-1">
      {/* Search Button - expands omnibar */}
      <button
        onClick={onForceExpand}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
          'transition-colors duration-150'
        )}
        title="Search (⌘K)"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Kit Chat Button */}
      <button
        onClick={onToggleKitMode}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
          'transition-all duration-150',
          isKitMode && 'bg-[var(--glass-bg)] text-[var(--color-accent)]'
        )}
        title="Kit AI Chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
