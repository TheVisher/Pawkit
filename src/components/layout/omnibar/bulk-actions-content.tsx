'use client';

import { motion } from 'framer-motion';
import { Trash2, Tag, FolderPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSelectionStore } from '@/lib/stores/selection-store';

interface BulkActionsContentProps {
  isCompact: boolean;
}

export function BulkActionsContent({ isCompact }: BulkActionsContentProps) {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const bulkDelete = useSelectionStore((s) => s.bulkDelete);
  const bulkAddTags = useSelectionStore((s) => s.bulkAddTags);
  const bulkAddToCollection = useSelectionStore((s) => s.bulkAddToCollection);

  const count = selectedIds.size;

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.15,
          ease: 'easeOut',
        }}
        className="absolute inset-0 flex items-center justify-center h-12 px-3 gap-2"
      >
        {/* Count */}
        <span className="text-sm font-medium text-[var(--color-accent)]">
          {count}
        </span>

        {/* Divider */}
        <div className="w-px h-4 bg-[var(--glass-border)]" />

        {/* Tags */}
        <button
          onClick={bulkAddTags}
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="Add tags"
        >
          <Tag className="h-4 w-4" />
        </button>

        {/* Pawkit */}
        <button
          onClick={bulkAddToCollection}
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="Add to Pawkit"
        >
          <FolderPlus className="h-4 w-4" />
        </button>

        {/* Delete */}
        <button
          onClick={bulkDelete}
          className="text-red-400 hover:text-red-300 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-[var(--glass-border)]" />

        {/* Clear */}
        <button
          onClick={clearSelection}
          className="text-text-muted hover:text-text-secondary transition-colors"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
      className="absolute inset-0 flex items-center h-12 px-3 gap-2"
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-2 border-r border-[var(--glass-border)]">
        <span className="text-sm font-medium text-[var(--color-accent)]">
          {count} selected
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-1">
        <button
          onClick={bulkAddTags}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
            'text-text-secondary hover:text-text-primary',
            'hover:bg-[var(--glass-bg-hover)]',
            'transition-colors'
          )}
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Tags</span>
        </button>

        <button
          onClick={bulkAddToCollection}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
            'text-text-secondary hover:text-text-primary',
            'hover:bg-[var(--glass-bg-hover)]',
            'transition-colors'
          )}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>Pawkit</span>
        </button>

        <button
          onClick={bulkDelete}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
            'text-red-400 hover:text-red-300',
            'hover:bg-red-500/10',
            'transition-colors'
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Clear button */}
      <button
        onClick={clearSelection}
        className={cn(
          'p-1.5 rounded-lg',
          'text-text-muted hover:text-text-secondary',
          'hover:bg-[var(--glass-bg-hover)]',
          'transition-colors'
        )}
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
