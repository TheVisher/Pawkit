'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ChevronDown, Tag, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTagStore } from '@/lib/stores/tag-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useViewStore } from '@/lib/stores/view-store';
import type { TagTreeNode } from '@/lib/utils/tag-hierarchy';
import { getTagColor } from '@/lib/utils/tag-colors';

interface TagTreeItemProps {
  node: TagTreeNode;
  level?: number;
  isExpanded?: boolean;
  onToggleExpand?: (path: string) => void;
  selectedTags: string[];
  onTagClick: (tag: string) => void;
}

function TagTreeItem({
  node,
  level = 0,
  isExpanded = false,
  onToggleExpand,
  selectedTags,
  onTagClick,
}: TagTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isSelected = selectedTags.includes(node.fullPath);
  const isVirtual = node.isVirtual;
  const colors = getTagColor(node.fullPath);

  return (
    <div>
      <div
        className={cn(
          'group flex items-center justify-between py-1 px-2 rounded-md transition-colors text-sm',
          isSelected
            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium'
            : isVirtual
              ? 'text-text-muted cursor-default'
              : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary cursor-pointer'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (!isVirtual) {
            onTagClick(node.fullPath);
          }
        }}
      >
        {/* Tag name with color indicator */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: colors.bg }}
          />
          <span className={cn('truncate', isVirtual && 'italic')}>
            {node.name}
          </span>
        </div>

        {/* Right side: Count and Expand/Collapse */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Show count - direct count for non-virtual, total for virtual */}
          <span
            className={cn(
              'text-xs text-text-muted transition-opacity',
              'opacity-60 group-hover:opacity-100'
            )}
          >
            {isVirtual ? node.totalCount : node.count}
          </span>

          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(node.fullPath);
              }}
              className="h-5 w-5 flex items-center justify-center rounded-sm hover:bg-bg-surface-2 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <TagTreeItem
              key={child.fullPath}
              node={child}
              level={level + 1}
              isExpanded={false}
              onToggleExpand={onToggleExpand}
              selectedTags={selectedTags}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TagTreeProps {
  /** Optional callback when tags change */
  onTagsChange?: (tags: string[]) => void;
}

export function TagTree({ onTagsChange }: TagTreeProps) {
  const router = useRouter();
  const tree = useTagStore((s) => s.tagTree);
  const isLoading = useTagStore((s) => s.isLoading);
  const refreshTags = useTagStore((s) => s.refreshTags);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  // Get selected tags from view store
  const selectedTags = useViewStore((s) => s.selectedTags);
  const setSelectedTags = useViewStore((s) => s.setSelectedTags);
  const toggleTag = useViewStore((s) => s.toggleTag);

  // Track expanded nodes
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Refresh tags when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      refreshTags(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, refreshTags]);

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleTagClick = (tag: string) => {
    toggleTag(tag);
    onTagsChange?.(selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag]
    );
  };

  // Clear all selected tags
  const handleClearTags = () => {
    setSelectedTags([]);
    onTagsChange?.([]);
  };

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-xs text-text-muted">
        Loading tags...
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-text-muted">
        No tags yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 pl-2">
      {/* Clear filter button when tags are selected */}
      {selectedTags.length > 0 && (
        <button
          onClick={handleClearTags}
          className="flex items-center gap-2 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <span>Clear filter ({selectedTags.length})</span>
        </button>
      )}

      {/* Tag tree */}
      {tree.map((node) => (
        <TagTreeItem
          key={node.fullPath}
          node={node}
          level={0}
          isExpanded={expandedPaths.has(node.fullPath)}
          onToggleExpand={handleToggleExpand}
          selectedTags={selectedTags}
          onTagClick={handleTagClick}
        />
      ))}
    </div>
  );
}

export default TagTree;
