'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Pin, Loader2, ArrowRight, X, ListTodo } from 'lucide-react';
import type { LocalCard } from '@/lib/db';
import { useDataStore } from '@/lib/stores/data-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { cn } from '@/lib/utils';
import { detectTodo, stripHtmlForDisplay } from '@/lib/utils/todo-detection';
import { useModalStore } from '@/lib/stores/modal-store';

interface QuickNoteCardProps {
  card: LocalCard;
  onClick?: () => void;
  isSelectionMode?: boolean;
  isDragging?: boolean;
  uniformHeight?: boolean; // For grid view - stretch to fill container
}

/**
 * Format relative time for display
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Compact QuickNote card with inline editing and smart todo detection
 */
export const QuickNoteCard = memo(function QuickNoteCard({
  card,
  onClick,
  isSelectionMode = false,
  isDragging = false,
  uniformHeight = false,
}: QuickNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateCard = useDataStore((s) => s.updateCard);
  const createTodo = useDataStore((s) => s.createTodo);
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const toast = useToastStore((s) => s.toast);

  const isSyncing = !card._synced;

  // Get plain text content for display
  const plainContent = stripHtmlForDisplay(card.content || '');

  // Check for todo detection
  const todoDetection = detectTodo(plainContent);
  const showTodoBadge =
    todoDetection.isTodo &&
    !card.convertedToTodo &&
    !card.dismissedTodoSuggestion;

  // Enter edit mode
  const handleEnterEdit = useCallback(() => {
    if (isSelectionMode || isDragging) return;

    const content = stripHtmlForDisplay(card.content || '');
    setEditContent(content);
    setOriginalContent(content);
    setIsEditing(true);
  }, [card.content, isSelectionMode, isDragging]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [editContent]);

  // Save content
  const handleSave = useCallback(async () => {
    if (editContent !== originalContent) {
      // Wrap in paragraph tags for consistency with editor
      const htmlContent = `<p>${editContent.replace(/\n/g, '</p><p>')}</p>`;
      await updateCard(card.id, { content: htmlContent });
    }
    setIsEditing(false);
  }, [editContent, originalContent, card.id, updateCard]);

  // Handle blur - save and exit
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Don't close if clicking on buttons within the card
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget?.closest('.quick-note-card')) return;

      handleSave();
    },
    [handleSave]
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditContent(originalContent);
        setIsEditing(false);
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [originalContent, handleSave]
  );

  // Handle card click
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // If already editing, don't do anything
      if (isEditing) return;

      // If selection mode or dragging, call the onClick handler
      if (isSelectionMode || isDragging) {
        onClick?.();
        return;
      }

      // Enter edit mode
      handleEnterEdit();
    },
    [isEditing, isSelectionMode, isDragging, onClick, handleEnterEdit]
  );

  // Promote to full note
  const handlePromote = useCallback(async () => {
    const content = editContent || plainContent;
    const firstLine = content.split('\n')[0].slice(0, 50) || 'Untitled Note';

    // Wrap in paragraph tags
    const htmlContent = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;

    await updateCard(card.id, {
      type: 'md-note',
      title: firstLine,
      content: htmlContent,
    });

    setIsEditing(false);
    openCardDetail(card.id);
  }, [editContent, plainContent, card.id, updateCard, openCardDetail]);

  // Add to todos
  const handleAddToTodo = useCallback(async () => {
    const task = todoDetection.task || plainContent;

    await createTodo({
      workspaceId: card.workspaceId,
      text: task,
      completed: false,
    });

    await updateCard(card.id, { convertedToTodo: true });

    toast({
      type: 'success',
      message: `Added to Todos: ${task.length > 30 ? task.slice(0, 30) + '...' : task}`,
    });
  }, [todoDetection.task, plainContent, card.workspaceId, card.id, createTodo, updateCard, toast]);

  // Dismiss todo suggestion
  const handleDismissTodo = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await updateCard(card.id, { dismissedTodoSuggestion: true });
    },
    [card.id, updateCard]
  );

  return (
    <div
      className={cn(
        'quick-note-card group relative w-full text-left',
        'transition-all duration-200 ease-out',
        !uniformHeight && 'hover:-translate-y-0.5',
        uniformHeight && 'h-full'
      )}
      onClick={handleCardClick}
    >
      {/* Card container with accent left border */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl',
          'border-l-4',
          uniformHeight ? 'h-full flex flex-col' : 'min-h-[80px]'
        )}
        style={{
          borderLeftColor: 'var(--color-accent)',
          background: 'var(--color-bg-surface-2)',
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--glass-border)',
          borderLeft: '4px solid var(--color-accent)',
        }}
      >
        <div className={cn('p-3', uniformHeight && 'flex-1 flex flex-col')}>
          {/* Content area */}
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Type something..."
              className={cn(
                'w-full bg-transparent text-sm resize-none',
                'text-[var(--color-text-primary)]',
                'placeholder:text-[var(--color-text-muted)]',
                'focus:outline-none',
                uniformHeight ? 'flex-1' : 'min-h-[60px]'
              )}
              style={{ scrollbarWidth: 'none' }}
              rows={uniformHeight ? undefined : 3}
            />
          ) : (
            <p
              className={cn(
                'text-sm leading-relaxed',
                uniformHeight ? 'flex-1 overflow-hidden' : 'line-clamp-3',
                'text-[var(--color-text-primary)]',
                !plainContent && 'text-[var(--color-text-muted)] italic'
              )}
            >
              {plainContent || 'Empty note'}
            </p>
          )}

          {/* Bottom row: timestamp, badges, actions */}
          <div className="flex items-center justify-between mt-2 gap-2">
            {/* Timestamp */}
            <span className="text-xs text-[var(--color-text-muted)]">
              {formatRelativeTime(new Date(card.createdAt))}
            </span>

            {/* Right side: badges and actions */}
            <div className="flex items-center gap-2">
              {/* Todo badge */}
              {showTodoBadge && !isEditing && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToTodo();
                    }}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                      'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
                      'hover:bg-[var(--color-accent)]/20 transition-colors'
                    )}
                  >
                    <ListTodo className="h-3 w-3" />
                    <span>Add to Todos</span>
                  </button>
                  <button
                    onClick={handleDismissTodo}
                    className={cn(
                      'p-1 rounded text-[var(--color-text-muted)]',
                      'hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]',
                      'transition-colors'
                    )}
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Promote to note button - visible in edit mode */}
              {isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePromote();
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                    'bg-[var(--glass-bg)] text-[var(--color-text-secondary)]',
                    'hover:bg-[var(--glass-bg-hover)] hover:text-[var(--color-text-primary)]',
                    'transition-colors'
                  )}
                >
                  <ArrowRight className="h-3 w-3" />
                  <span>Note</span>
                </button>
              )}

              {/* Syncing indicator */}
              {isSyncing && (
                <Loader2 className="h-3 w-3 animate-spin text-[var(--color-text-muted)]" />
              )}

              {/* Pinned indicator */}
              {card.pinned && (
                <Pin className="h-3 w-3 text-[var(--color-accent)]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div
        className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(ellipse at center, hsl(var(--hue-accent) var(--sat-accent) 50% / 0.2) 0%, transparent 70%)`,
          filter: 'blur(10px)',
        }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.content === nextProps.card.content &&
    prevProps.card.pinned === nextProps.card.pinned &&
    prevProps.card._synced === nextProps.card._synced &&
    prevProps.card.convertedToTodo === nextProps.card.convertedToTodo &&
    prevProps.card.dismissedTodoSuggestion === nextProps.card.dismissedTodoSuggestion &&
    prevProps.card.createdAt === nextProps.card.createdAt &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.uniformHeight === nextProps.uniformHeight
  );
});
