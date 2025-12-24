'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
  Link2,
  FileText,
  StickyNote,
  Upload,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import { useActiveToast, useIsEjecting, useToastStore, type ToastType } from '@/lib/stores/toast-store';
import { useCommandPalette } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OmnibarProps {
  isCompact: boolean;
}

// Toast type to icon mapping
const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

// Toast type to color mapping
const toastColors: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

// Add menu items
const addMenuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark', shortcut: '⌘⇧B' },
  { icon: FileText, label: 'New Note', action: 'note', shortcut: '⌘⇧N' },
  { icon: StickyNote, label: 'Quick Note', action: 'quick-note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
];

export function Omnibar({ isCompact }: OmnibarProps) {
  const [mounted, setMounted] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDiscardingRef = useRef(false);

  // Effective compact state - can be overridden by forceExpanded
  const effectivelyCompact = isCompact && !forceExpanded;

  const activeToast = useActiveToast();
  const isEjecting = useIsEjecting();
  const dismissActiveToast = useToastStore((s) => s.dismissActiveToast);
  const toast = useToastStore((s) => s.toast);
  const { toggle: toggleCommandPalette } = useCommandPalette();
  const openAddCard = useModalStore((s) => s.openAddCard);
  const createCard = useDataStore((s) => s.createCard);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track actual textarea height for omnibar expansion
  const [textareaHeight, setTextareaHeight] = useState(0);

  // Auto-resize textarea and track height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxTextareaHeight = 160; // Max height before scrolling
      const actualHeight = Math.min(scrollHeight, maxTextareaHeight);
      textareaRef.current.style.height = `${actualHeight}px`;
      setTextareaHeight(actualHeight);

      // Enable scrolling if content exceeds max
      textareaRef.current.style.overflowY = scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
    }
  }, [quickNoteText]);

  // Focus textarea when entering quick note mode
  useEffect(() => {
    if (isQuickNoteMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isQuickNoteMode]);

  // Auto-collapse on scroll when force expanded (if no content)
  useEffect(() => {
    if (!forceExpanded) return;

    const handleScroll = () => {
      // Only collapse if there's no content
      if (!quickNoteText.trim()) {
        setForceExpanded(false);
        setIsQuickNoteMode(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceExpanded, quickNoteText]);

  // Auto-collapse after 5 seconds of inactivity (if no content)
  useEffect(() => {
    if (!forceExpanded || quickNoteText.trim()) return;

    const timer = setTimeout(() => {
      if (!quickNoteText.trim()) {
        setForceExpanded(false);
        setIsQuickNoteMode(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [forceExpanded, quickNoteText]);

  // Calculate expanded height based on actual textarea height
  const getExpandedHeight = useCallback(() => {
    if (!isQuickNoteMode) return 48;
    // Container padding + textarea height + hints row (with border & padding)
    const containerPadding = 16;
    const hintsHeight = quickNoteText.length > 0 ? 32 : 0; // Height of hints row including margin/border/padding
    const minHeight = 48;
    const calculatedHeight = containerPadding + Math.max(28, textareaHeight) + hintsHeight;
    return Math.max(minHeight, calculatedHeight);
  }, [isQuickNoteMode, quickNoteText, textareaHeight]);

  const saveQuickNote = useCallback(async () => {
    if (!quickNoteText.trim() || !currentWorkspace) return;

    try {
      // Create the quick note card
      await createCard({
        workspaceId: currentWorkspace.id,
        type: 'quick-note',
        url: '',
        title: quickNoteText.slice(0, 50) + (quickNoteText.length > 50 ? '...' : ''),
        content: `<p>${quickNoteText.replace(/\n/g, '</p><p>')}</p>`,
        tags: [],
        collections: [],
        pinned: false,
        isFileCard: false,
        status: 'READY',
      });

      // Reset state first so omnibar closes
      setQuickNoteText('');
      setIsQuickNoteMode(false);
      setTextareaHeight(0);
      setForceExpanded(false);

      // Show success toast
      toast({
        type: 'success',
        message: 'Quick note saved',
      });
    } catch (error) {
      console.error('Failed to save quick note:', error);
      toast({
        type: 'error',
        message: 'Failed to save quick note',
      });
    }
  }, [quickNoteText, currentWorkspace, createCard, toast]);

  const handleQuickNoteKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter to save (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveQuickNote();
    }
    // Escape to cancel - double escape to force discard
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // Also stop the native event from bubbling to window
      e.nativeEvent.stopImmediatePropagation();

      if (showDiscardConfirm) {
        // Second escape - confirm discard
        isDiscardingRef.current = true;
        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setShowDiscardConfirm(false);
        setTextareaHeight(0);
        setForceExpanded(false);
        // Blur to fully reset
        (e.target as HTMLTextAreaElement)?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      } else if (quickNoteText.trim()) {
        // First escape with content - show confirmation
        setShowDiscardConfirm(true);
      } else {
        // No content - just close
        setIsQuickNoteMode(false);
        setQuickNoteText('');
        setForceExpanded(false);
      }
    }
  }, [quickNoteText, saveQuickNote, showDiscardConfirm]);

  const handleQuickNoteBlur = useCallback((e: React.FocusEvent) => {
    // Don't run blur logic if we're in the middle of discarding
    if (isDiscardingRef.current) return;

    // Don't close if clicking within the omnibar or on discard confirm
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.omnibar-container')) return;

    if (quickNoteText.trim()) {
      setShowDiscardConfirm(true);
    } else {
      setIsQuickNoteMode(false);
    }
  }, [quickNoteText]);

  const confirmDiscard = useCallback(() => {
    isDiscardingRef.current = true;
    setQuickNoteText('');
    setIsQuickNoteMode(false);
    setShowDiscardConfirm(false);
    setTextareaHeight(0);
    setForceExpanded(false);
    textareaRef.current?.blur();
    // Reset flag after blur event has fired
    setTimeout(() => { isDiscardingRef.current = false; }, 0);
  }, []);

  const cancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    textareaRef.current?.focus();
  }, []);

  // Global escape handler for discard dialog
  useEffect(() => {
    if (!showDiscardConfirm) return;

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Second escape - confirm discard
        isDiscardingRef.current = true;
        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setShowDiscardConfirm(false);
        setTextareaHeight(0);
        setForceExpanded(false);
        // Blur the textarea to fully reset
        textareaRef.current?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      }
    };

    window.addEventListener('keydown', handleGlobalEscape);
    return () => window.removeEventListener('keydown', handleGlobalEscape);
  }, [showDiscardConfirm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      // ⌘⇧B to add bookmark
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'b') {
        e.preventDefault();
        openAddCard('bookmark');
      }
      // ⌘⇧N to add note
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        openAddCard('note');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, openAddCard]);

  const handleSearchClick = () => {
    toggleCommandPalette();
  };

  const handleAddAction = (action: string) => {
    switch (action) {
      case 'bookmark':
        openAddCard('bookmark');
        break;
      case 'note':
      case 'quick-note':
        openAddCard('note');
        break;
      case 'upload':
        // TODO: Implement file upload
        console.log('Upload action - coming soon');
        break;
      case 'event':
        // TODO: Implement event creation
        console.log('Event action - coming soon');
        break;
      default:
        console.log('Unknown action:', action);
    }
    setIsAddMenuOpen(false);
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="h-12 w-[400px] rounded-2xl bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]" />
    );
  }

  const showToast = !!activeToast;
  const expandedHeight = getExpandedHeight();

  return (
    <>
      <motion.div
        className={cn(
          'omnibar-container relative flex flex-col justify-start overflow-hidden',
          'bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]',
          'border border-[var(--glass-border)]',
          'shadow-[var(--glass-shadow)]',
          'rounded-2xl'
        )}
        initial={false}
        animate={{
          width: effectivelyCompact ? 140 : 400,
          height: expandedHeight,
          // Elastic "bounce" when ejecting a toast
          scaleY: isEjecting ? 1.04 : 1,
          scaleX: isEjecting ? 0.98 : 1,
        }}
        transition={{
          width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
          // Elastic spring for the "push through" effect
          scaleY: {
            type: 'spring',
            stiffness: 500,
            damping: 15,
            mass: 0.8,
          },
          scaleX: {
            type: 'spring',
            stiffness: 500,
            damping: 15,
            mass: 0.8,
          },
        }}
        style={{ transformOrigin: 'center top' }}
      >
        <AnimatePresence mode="wait">
          {showToast ? (
            <ToastContent
              key="toast"
              toast={activeToast}
              isCompact={isCompact}
              onDismiss={dismissActiveToast}
            />
          ) : (
            <IdleContent
              key="idle"
              isCompact={effectivelyCompact}
              isAddMenuOpen={isAddMenuOpen}
              setIsAddMenuOpen={setIsAddMenuOpen}
              onSearchClick={handleSearchClick}
              onAddAction={handleAddAction}
              isQuickNoteMode={isQuickNoteMode}
              setIsQuickNoteMode={setIsQuickNoteMode}
              quickNoteText={quickNoteText}
              setQuickNoteText={setQuickNoteText}
              textareaRef={textareaRef}
              onQuickNoteKeyDown={handleQuickNoteKeyDown}
              onQuickNoteBlur={handleQuickNoteBlur}
              onSaveQuickNote={saveQuickNote}
              onForceExpand={() => {
                setForceExpanded(true);
                setIsQuickNoteMode(true);
                // Focus after animation completes
                setTimeout(() => textareaRef.current?.focus(), 100);
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Discard confirmation overlay */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDiscard}
          >
            <motion.div
              className={cn(
                'p-4 rounded-xl max-w-sm',
                'bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]',
                'border border-[var(--glass-border)]',
                'shadow-[var(--glass-shadow)]'
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-text-primary mb-4">Discard this quick note?</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelDiscard}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm',
                    'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]',
                    'text-text-secondary hover:text-text-primary',
                    'transition-colors'
                  )}
                >
                  Keep editing
                </button>
                <button
                  onClick={confirmDiscard}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm',
                    'bg-red-500/20 hover:bg-red-500/30',
                    'text-red-400 hover:text-red-300',
                    'transition-colors'
                  )}
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

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
}

function IdleContent({
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
}: IdleContentProps) {
  const hasContent = quickNoteText.length > 0;

  return (
    <motion.div
      className={cn(
        "flex w-full h-full px-1",
        hasContent ? "items-start pt-0.5" : "items-center"
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Plus Button */}
      <DropdownMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center justify-center shrink-0',
              'w-10 h-10 rounded-xl',
              'text-text-muted hover:text-text-primary',
              'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
              'transition-colors duration-150'
            )}
          >
            <Plus className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56"
        >
          {addMenuItems.map((item) => (
            <DropdownMenuItem
              key={item.action}
              onClick={() => onAddAction(item.action)}
              className="flex items-center gap-3 text-text-secondary hover:text-text-primary focus:bg-[var(--glass-bg)]"
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <kbd className="text-xs text-text-muted">{item.shortcut}</kbd>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AnimatePresence mode="wait">
        {isCompact ? (
          <CompactButtons key="compact" onSearchClick={onSearchClick} onForceExpand={onForceExpand} />
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
          />
        )}
      </AnimatePresence>
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
}

function ExpandedContent({
  onSearchClick,
  isQuickNoteMode,
  setIsQuickNoteMode,
  quickNoteText,
  setQuickNoteText,
  textareaRef,
  onQuickNoteKeyDown,
  onQuickNoteBlur,
  onSaveQuickNote,
}: ExpandedContentProps) {
  const hasContent = quickNoteText.length > 0;

  return (
    <motion.div
      className={cn(
        "flex flex-1 min-w-0 h-full",
        hasContent ? "items-start" : "items-center"
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Quick Note Input / Search Area */}
      <div className={cn(
        "flex-1 min-w-0 flex",
        hasContent
          ? "flex-col py-1.5 pr-2"
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
              : 'flex-1 text-text-muted h-6'
          )}
          style={{ scrollbarWidth: 'none' }}
          rows={1}
          onFocus={() => setIsQuickNoteMode(true)}
        />

        {/* Hints - only show when there's content */}
        {hasContent && (
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
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-10 h-10 rounded-xl',
            'text-text-muted hover:text-text-primary',
            'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
            'transition-colors duration-150'
          )}
          title="Kit Chat (coming soon)"
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
}

function CompactButtons({ onSearchClick, onForceExpand }: CompactButtonsProps) {
  const handleClick = () => {
    onForceExpand();
  };

  return (
    <motion.div
      className="flex items-center justify-center flex-1 gap-1"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Search Button - expands omnibar */}
      <button
        onClick={handleClick}
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
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
          'transition-colors duration-150'
        )}
        title="Kit Chat (coming soon)"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

// =============================================================================
// TOAST CONTENT
// =============================================================================

interface ToastContentProps {
  toast: NonNullable<ReturnType<typeof useActiveToast>>;
  isCompact: boolean;
  onDismiss: () => void;
}

function ToastContent({ toast, isCompact, onDismiss }: ToastContentProps) {
  const Icon = toastIcons[toast.type];
  const colorClass = toastColors[toast.type];

  return (
    <motion.div
      className="flex items-center w-full h-full px-3 gap-3"
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 20,
        mass: 0.8,
      }}
    >
      {/* Icon */}
      <div className={cn('shrink-0', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Message */}
      <span
        className={cn(
          'flex-1 text-sm text-text-primary truncate',
          isCompact && 'text-xs'
        )}
      >
        {toast.message}
      </span>

      {/* Action Button (if provided) */}
      {toast.action && !isCompact && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className={cn(
            'shrink-0 px-3 py-1 rounded-lg text-xs font-medium',
            'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]',
            'text-text-primary',
            'transition-colors duration-150'
          )}
        >
          {toast.action.label}
        </button>
      )}

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className={cn(
          'shrink-0 flex items-center justify-center',
          'w-7 h-7 rounded-lg',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)]',
          'transition-colors duration-150'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
