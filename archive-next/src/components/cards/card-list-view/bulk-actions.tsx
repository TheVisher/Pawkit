'use client';

import { Trash2, Tag, FolderPlus, X } from 'lucide-react';

// =============================================================================
// BULK ACTION BAR
// =============================================================================

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onAddTags: () => void;
  onAddToCollection: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onAddTags,
  onAddToCollection,
  onClear,
}: BulkActionBarProps) {
  return (
    <div
      className="sticky bottom-0 z-30 flex items-center gap-3 px-4 py-3 border-t border-[var(--color-text-muted)]/20"
      style={{
        background: 'var(--color-bg-surface-2)',
      }}
    >
      <span className="text-sm text-[var(--color-text-primary)] font-medium">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onAddTags}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 rounded-md transition-colors"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Add Tags</span>
        </button>
        <button
          onClick={onAddToCollection}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 rounded-md transition-colors"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>Add to Pawkit</span>
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      </div>
      <div className="flex-1" />
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary rounded-md transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        <span>Clear selection</span>
      </button>
    </div>
  );
}

// =============================================================================
// GROUP SEPARATOR
// =============================================================================

interface GroupSeparatorProps {
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export function GroupSeparator({ label, count, icon: Icon }: GroupSeparatorProps) {
  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-[var(--color-bg-surface)]/80 border-b border-[var(--color-text-muted)]/15">
      {Icon && <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />}
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-xs text-[var(--color-text-muted)]">
        {count} item{count === 1 ? '' : 's'}
      </span>
    </div>
  );
}
