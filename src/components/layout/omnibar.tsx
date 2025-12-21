'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Command,
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
  Sparkles,
} from 'lucide-react';
import { useActiveToast, useIsEjecting, useToastStore, type ToastType } from '@/lib/stores/toast-store';
import { useCommandPalette } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const activeToast = useActiveToast();
  const isEjecting = useIsEjecting();
  const dismissActiveToast = useToastStore((s) => s.dismissActiveToast);
  const { toggle: toggleCommandPalette } = useCommandPalette();
  const openAddCard = useModalStore((s) => s.openAddCard);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="h-12 w-[400px] rounded-2xl bg-[hsl(0_0%_12%/0.70)] backdrop-blur-xl" />
    );
  }

  const showToast = !!activeToast;

  return (
    <motion.div
      className={cn(
        'relative flex items-center gap-1',
        'bg-[hsl(0_0%_12%/0.70)] backdrop-blur-xl',
        'border border-white/10',
        'shadow-[0_8px_16px_hsl(0_0%_0%/0.5),0_16px_32px_hsl(0_0%_0%/0.3)]',
        'rounded-2xl',
        'transition-[width] duration-300 ease-out'
      )}
      initial={false}
      animate={{
        width: isCompact ? 140 : 400,
        height: 48,
        scaleY: isEjecting ? 1.02 : 1,
      }}
      transition={{
        width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        scaleY: { duration: 0.15, ease: 'easeOut' },
      }}
      style={{ transformOrigin: 'center bottom' }}
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
            isCompact={isCompact}
            isAddMenuOpen={isAddMenuOpen}
            setIsAddMenuOpen={setIsAddMenuOpen}
            onSearchClick={handleSearchClick}
            onAddAction={handleAddAction}
            inputRef={inputRef}
          />
        )}
      </AnimatePresence>
    </motion.div>
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
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function IdleContent({
  isCompact,
  isAddMenuOpen,
  setIsAddMenuOpen,
  onSearchClick,
  onAddAction,
}: IdleContentProps) {
  return (
    <motion.div
      className="flex items-center w-full h-full px-1"
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
              'hover:bg-white/5 active:bg-white/10',
              'transition-colors duration-150'
            )}
          >
            <Plus className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 bg-[hsl(0_0%_12%/0.95)] backdrop-blur-xl border-white/10"
        >
          {addMenuItems.map((item) => (
            <DropdownMenuItem
              key={item.action}
              onClick={() => onAddAction(item.action)}
              className="flex items-center gap-3 text-text-secondary hover:text-text-primary focus:bg-white/5"
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
          <CompactButtons key="compact" onSearchClick={onSearchClick} />
        ) : (
          <ExpandedContent key="expanded" onSearchClick={onSearchClick} />
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
}

function ExpandedContent({ onSearchClick }: ExpandedContentProps) {
  return (
    <motion.div
      className="flex items-center flex-1 h-full"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Search Input Area */}
      <button
        onClick={onSearchClick}
        className={cn(
          'flex items-center flex-1 h-10 px-3 gap-2',
          'rounded-xl',
          'text-text-muted hover:text-text-secondary',
          'hover:bg-white/5',
          'transition-colors duration-150',
          'cursor-pointer'
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="text-sm">Search Pawkit...</span>
      </button>

      {/* Command Shortcut */}
      <button
        onClick={onSearchClick}
        className={cn(
          'flex items-center justify-center shrink-0',
          'h-10 px-3 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-white/5 active:bg-white/10',
          'transition-colors duration-150'
        )}
      >
        <kbd className="flex items-center gap-1 text-xs">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Kit Button (AI) */}
      <button
        className={cn(
          'flex items-center justify-center shrink-0',
          'w-10 h-10 rounded-xl',
          'text-text-muted',
          'hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10',
          'transition-all duration-150',
          'hover:shadow-[0_0_12px_hsl(270_50%_50%/0.3)]'
        )}
      >
        <Sparkles className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

// =============================================================================
// COMPACT BUTTONS (Icon only)
// =============================================================================

interface CompactButtonsProps {
  onSearchClick: () => void;
}

function CompactButtons({ onSearchClick }: CompactButtonsProps) {
  return (
    <motion.div
      className="flex items-center justify-center flex-1 gap-1"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Search Button */}
      <button
        onClick={onSearchClick}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-white/5 active:bg-white/10',
          'transition-colors duration-150'
        )}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Command Shortcut */}
      <button
        onClick={onSearchClick}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-white/5 active:bg-white/10',
          'transition-colors duration-150'
        )}
      >
        <kbd className="flex items-center gap-0.5 text-xs">
          <Command className="h-3 w-3" />K
        </kbd>
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
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
            'bg-white/10 hover:bg-white/15',
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
          'hover:bg-white/10',
          'transition-colors duration-150'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
