'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  FileText,
  Globe,
  MessageCircle,
  MessageSquare,
  Hash,
  Folder,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addMenuItems, type SearchResults } from './types';

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
}: IdleContentProps) {
  const hasContent = quickNoteText.length > 0;

  // Check if search results are showing
  const hasSearchResults = searchResults && (
    searchResults.cards.length > 0 ||
    searchResults.collections.length > 0 ||
    (searchResults.tags?.length || 0) > 0 ||
    searchResults.actions.length > 0
  );
  const showEmptyState = isQuickNoteMode && !hasContent && searchResults && searchResults.cards.length > 0;

  // Calculate index offsets for each section
  const getGlobalIndex = (section: 'cards' | 'collections' | 'tags' | 'actions', localIndex: number): number => {
    if (!searchResults) return -1;
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
    <motion.div
      className="flex flex-col w-full h-full px-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Top Row: Plus Button + Search + Chat */}
      <div className="flex w-full shrink-0 items-start pt-1">
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

        <AnimatePresence mode="wait">
          {isCompact && !isQuickNoteMode ? (
            <CompactButtons
              key="compact"
              onSearchClick={onSearchClick}
              onForceExpand={onForceExpand}
              isKitMode={isKitMode}
              onToggleKitMode={onToggleKitMode}
            />
          ) : (
            <ExpandedContent
              key="expanded"
              onSearchClick={onSearchClick}
              isQuickNoteMode={isQuickNoteMode}
              setIsQuickNoteMode={setIsQuickNoteMode}
              quickNoteText={quickNoteText}
              setQuickNoteText={setQuickNoteText}
              textareaRef={textareaRef}
              onQuickNoteKeyDown={onQuickNoteKeyDown}
              onQuickNoteBlur={onQuickNoteBlur}
              onSaveQuickNote={onSaveQuickNote}
              isKitMode={isKitMode}
              onToggleKitMode={onToggleKitMode}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Search Results - Full Width */}
      {isQuickNoteMode && hasSearchResults && (
        <div className="flex-1 overflow-y-auto mt-2 border-t border-[var(--glass-border)] pt-2">
          {/* Cards Section */}
          {searchResults.cards.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                {showEmptyState ? 'Recent' : 'Cards'}
              </div>
              {searchResults.cards.map((card, idx) => (
                <button
                  key={card.id}
                  onClick={() => onSelectResult(getGlobalIndex('cards', idx))}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
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
                    {card.domain && (
                      <div className="text-xs text-text-muted truncate">{card.domain}</div>
                    )}
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
                  key={col.id}
                  onClick={() => onSelectResult(getGlobalIndex('collections', idx))}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
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
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
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
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
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

          {/* Tips row for empty state */}
          {showEmptyState && (
            <div className="px-3 py-2 text-xs text-text-muted flex items-center gap-4 border-t border-[var(--glass-border)] mt-2">
              <span><kbd className="px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">/</kbd> commands</span>
              <span><kbd className="px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">#</kbd> tags</span>
              <span><kbd className="px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">@</kbd> pawkits</span>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ADD MODE PANEL - Expandable menu for adding items                  */}
      {/* =================================================================== */}
      {isAddMode && (
        <div className="flex-1 overflow-y-auto mt-2 border-t border-[var(--glass-border)] pt-2">
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Create New
          </div>
          {addMenuItems.map((item, idx) => (
            <button
              key={item.action}
              onClick={() => onAddModeAction(item.action)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
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
        <div className="flex-1 overflow-y-auto mt-2 border-t border-[var(--glass-border)] pt-2">
          <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Kit AI
          </div>
          {kitMenuItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onKitModeAction(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
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
}: ExpandedContentProps) {
  const hasContent = quickNoteText.length > 0;
  const isSearchMode = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');
  const showHints = hasContent && !isSearchMode;

  return (
    <motion.div
      className={cn(
        "flex flex-1 min-w-0",
        hasContent ? "items-start" : "items-center h-10"
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
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
          placeholder="Search or quick note..."
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
    </motion.div>
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
    <motion.div
      className="flex items-center justify-center flex-1 h-10 gap-1"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
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
    </motion.div>
  );
}
