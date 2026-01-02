/**
 * Portal-specific Pawkit tree item
 * Similar to main app's PawkitTreeItem but uses click handlers instead of routing
 */

import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LocalCollection } from '../stores/portal-stores';

// Local cn utility to avoid importing from main app
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PortalPawkitItemProps {
  collection: LocalCollection;
  childCollections?: LocalCollection[];
  level?: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  onToggleExpand?: (id: string) => void;
  onSelect?: (slug: string) => void;
  cardCount?: number;
  // External drag targeting
  isExternalDragActive?: boolean;
  isDropTarget?: boolean;
}

export function PortalPawkitItem({
  collection,
  childCollections = [],
  level = 0,
  isExpanded = false,
  isSelected = false,
  onToggleExpand,
  onSelect,
  cardCount = 0,
  isExternalDragActive = false,
  isDropTarget = false,
}: PortalPawkitItemProps) {
  const hasChildren = childCollections.length > 0;

  // DnD Drop Target (for internal React DnD)
  const { setNodeRef, isOver } = useDroppable({
    id: `collection-${collection.slug}`,
    data: {
      type: 'collection',
      slug: collection.slug,
      name: collection.name,
    },
  });

  // Highlight when either internal or external drag is over this item
  const isHighlighted = isOver || isDropTarget;

  const handleClick = () => {
    onSelect?.(collection.slug);
  };

  return (
    <div className="select-none relative">
      <div
        ref={setNodeRef}
        data-pawkit-slug={collection.slug}
        className={cn(
          'group flex items-center justify-between py-2 px-2 rounded-xl transition-colors duration-200 cursor-pointer text-sm border border-transparent relative',
          isSelected
            ? 'text-text-primary font-medium'
            : 'text-text-secondary hover:text-text-primary',
          isHighlighted && 'bg-[var(--color-accent)]/20 ring-2 ring-inset ring-[var(--color-accent)]'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isSelected && (
          <motion.div
            layoutId="active-portal-item"
            className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
            initial={false}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
          />
        )}

        {/* Collection info */}
        <div className="flex items-center flex-1 min-w-0 z-10 relative">
          <span className="relative flex items-center gap-2 min-w-0">
            {isSelected ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 group-hover:text-[var(--color-accent)]/80 transition-colors" />
            )}
            <span className="truncate">{collection.name}</span>
            {/* Hover Glow Line */}
            {!isSelected && (
              <div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
            )}
          </span>
        </div>

        {/* Right side: Card count and Expand/Collapse */}
        <div className="flex items-center gap-1 shrink-0 z-10 relative">
          {cardCount > 0 && (
            <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              {cardCount}
            </span>
          )}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(collection.id);
              }}
              className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
    </div>
  );
}
