'use client';

/**
 * Tags Sidebar
 * Displays tag editing panel when a tag is selected, or tag health dashboard when nothing is selected
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import {
  X,
  Tag,
  Trash2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagColorPicker } from '@/components/tags/tag-color-picker';

interface TagsSidebarProps {
  selectedTag: string | null;
  tagCounts: Record<string, number>;
  uniqueTags: string[];
  tagColors: Record<string, string>;
  onClose: () => void;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
  onDeleteUnusedTags: () => Promise<void>;
  onSetTagColor: (tag: string, hsl: string | null) => void;
  getTagColor: (tag: string) => string;
  isProcessing?: boolean;
}

export function TagsSidebar({
  selectedTag,
  tagCounts,
  uniqueTags,
  tagColors,
  onClose,
  onRenameTag,
  onDeleteTag,
  onDeleteUnusedTags,
  onSetTagColor,
  getTagColor,
  isProcessing = false,
}: TagsSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {selectedTag ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <TagEditingPanel
              tag={selectedTag}
              tagCounts={tagCounts}
              tagColors={tagColors}
              onClose={onClose}
              onRename={onRenameTag}
              onDelete={onDeleteTag}
              onSetColor={onSetTagColor}
              getColor={getTagColor}
              isProcessing={isProcessing}
            />
          </motion.div>
        ) : (
          <motion.div
            key="health"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <TagHealthDashboard
              tagCounts={tagCounts}
              uniqueTags={uniqueTags}
              onDeleteUnused={onDeleteUnusedTags}
              isProcessing={isProcessing}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// TAG EDITING PANEL
// =============================================================================

interface TagEditingPanelProps {
  tag: string;
  tagCounts: Record<string, number>;
  tagColors: Record<string, string>;
  onClose: () => void;
  onRename: (oldTag: string, newTag: string) => Promise<void>;
  onDelete: (tag: string) => Promise<void>;
  onSetColor: (tag: string, hsl: string | null) => void;
  getColor: (tag: string) => string;
  isProcessing: boolean;
}

function TagEditingPanel({
  tag,
  tagCounts,
  tagColors,
  onClose,
  onRename,
  onDelete,
  onSetColor,
  getColor,
  isProcessing,
}: TagEditingPanelProps) {
  const router = useRouter();
  const [newName, setNewName] = useState(tag);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when selected tag changes
  useEffect(() => {
    setNewName(tag);
    setShowDeleteConfirm(false);
  }, [tag]);

  const cardCount = tagCounts[tag] || 0;
  const hasChanges = newName.trim() !== tag && newName.trim() !== '';

  const handleRename = async () => {
    if (!hasChanges) return;
    setIsRenaming(true);
    try {
      await onRename(tag, newName.trim());
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(tag);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleViewInLibrary = () => {
    router.push(`/library?tag=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-[var(--color-accent)]" />
          <span className="text-sm font-medium text-text-primary">Edit Tag</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 py-4 space-y-6">
        {/* Current Tag Display */}
        <div className="flex justify-center">
          <TagBadge tag={tag} size="md" />
        </div>

        {/* Tag Name Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-text-muted">
            Tag Name
          </label>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              className="bg-bg-surface-2 border-border-subtle"
              disabled={isProcessing || isRenaming}
            />
            {hasChanges && (
              <Button
                onClick={handleRename}
                disabled={isProcessing || isRenaming}
                size="sm"
                className="shrink-0"
              >
                {isRenaming ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                  </span>
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          {hasChanges && (
            <p className="text-xs text-text-muted">
              This will rename the tag across all {cardCount} card{cardCount !== 1 ? 's' : ''}.
            </p>
          )}
        </div>

        {/* Tag Color Picker */}
        <TagColorPicker
          tag={tag}
          currentHsl={getColor(tag)}
          onColorChange={(hsl) => onSetColor(tag, hsl)}
          isCustom={tag in tagColors}
        />

        {/* Card Count */}
        <div className="p-3 rounded-lg bg-bg-surface-1 border border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Used by</span>
            <span className="text-sm font-medium text-text-primary">
              {cardCount} card{cardCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* View in Library Link */}
        {cardCount > 0 && (
          <button
            onClick={handleViewInLibrary}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
              'text-sm text-text-secondary hover:text-text-primary',
              'bg-bg-surface-1 hover:bg-bg-surface-2 border border-border-subtle',
              'transition-colors group'
            )}
          >
            <span>View in Library</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Delete Section */}
      <div className="pt-4 border-t border-border-subtle">
        <AnimatePresence mode="wait">
          {showDeleteConfirm ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <p className="text-xs text-text-muted text-center">
                Remove this tag from {cardCount} card{cardCount !== 1 ? 's' : ''}?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                variant="ghost"
                className="w-full text-red-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tag
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// TAG HEALTH DASHBOARD
// =============================================================================

interface TagHealthDashboardProps {
  tagCounts: Record<string, number>;
  uniqueTags: string[];
  onDeleteUnused: () => Promise<void>;
  isProcessing: boolean;
}

function TagHealthDashboard({
  tagCounts,
  uniqueTags,
  onDeleteUnused,
  isProcessing,
}: TagHealthDashboardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const unusedTags = uniqueTags.filter((tag) => (tagCounts[tag] || 0) === 0);
    const mostUsed = [...uniqueTags]
      .filter((tag) => (tagCounts[tag] || 0) > 0)
      .sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0))
      .slice(0, 5);

    return {
      total: uniqueTags.length,
      unused: unusedTags.length,
      unusedTags,
      mostUsed,
    };
  }, [tagCounts, uniqueTags]);

  const handleDeleteUnused = async () => {
    setIsDeleting(true);
    try {
      await onDeleteUnused();
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border-subtle">
        <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
        <span className="text-sm font-medium text-text-primary">Tag Health</span>
      </div>

      {/* Content */}
      <div className="flex-1 py-4 space-y-6 overflow-y-auto">
        {/* Total Stats */}
        <div className="p-4 rounded-lg bg-bg-surface-1 border border-border-subtle">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-muted">Total Tags</div>
            </div>
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                stats.unused > 0 ? 'text-amber-400' : 'text-green-400'
              )}>
                {stats.unused}
              </div>
              <div className="text-xs text-text-muted">Unused</div>
            </div>
          </div>
        </div>

        {/* Unused Tags Section */}
        {stats.unused > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-muted">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium uppercase">Unused Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-bg-surface-1 border border-border-subtle max-h-32 overflow-y-auto">
              {stats.unusedTags.map((tag) => (
                <TagBadge key={tag} tag={tag} size="sm" />
              ))}
            </div>

            {/* Delete All Unused */}
            <AnimatePresence mode="wait">
              {showDeleteConfirm ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <p className="text-xs text-text-muted text-center">
                    Delete {stats.unused} unused tag{stats.unused !== 1 ? 's' : ''}?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={handleDeleteUnused}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete All'}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-amber-400 hover:text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete All Unused
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Most Used Tags Section */}
        {stats.mostUsed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-muted">
              <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="text-xs font-medium uppercase">Most Used</span>
            </div>
            <div className="space-y-2">
              {stats.mostUsed.map((tag, index) => (
                <div
                  key={tag}
                  className="flex items-center justify-between p-2 rounded-lg bg-bg-surface-1 border border-border-subtle"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-4">{index + 1}.</span>
                    <TagBadge tag={tag} size="sm" />
                  </div>
                  <span className="text-xs text-text-muted">
                    {tagCounts[tag]} card{tagCounts[tag] !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Tag className="h-10 w-10 text-text-muted mb-3 opacity-50" />
            <p className="text-sm text-text-secondary">No tags yet</p>
            <p className="text-xs text-text-muted mt-1">
              Tags will appear here as you create them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
