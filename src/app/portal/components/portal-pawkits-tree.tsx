'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalCollection } from '@/lib/db/types';

interface PortalPawkitsTreeProps {
  collections: LocalCollection[];
  selectedSlug: string | null;
  onSelectPawkit: (slug: string | null) => void;
  isExternalDragActive?: boolean;
  dropTargetSlug?: string | null;
}

export function PortalPawkitsTree({
  collections,
  selectedSlug,
  onSelectPawkit,
  isExternalDragActive = false,
  dropTargetSlug = null,
}: PortalPawkitsTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const rootCollections = useMemo(() => {
    return collections
      .filter((c) => !c.parentId && !c._deleted)
      .sort((a, b) => a.position - b.position);
  }, [collections]);

  const getChildCollections = (parentId: string) => {
    return collections
      .filter((c) => c.parentId === parentId && !c._deleted)
      .sort((a, b) => a.position - b.position);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderItem = (collection: LocalCollection, level: number = 0) => {
    const children = getChildCollections(collection.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(collection.id);
    const isSelected = selectedSlug === collection.slug;
    const isDropTarget = dropTargetSlug === collection.slug;

    return (
      <div key={collection.id}>
        <div
          data-pawkit-slug={collection.slug}
          className={cn(
            'group flex items-center justify-between py-2 px-2 rounded-xl transition-colors duration-200 cursor-pointer text-sm border border-transparent relative',
            isSelected ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary',
            isDropTarget && 'bg-accent/20 ring-2 ring-inset ring-accent'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onSelectPawkit(collection.slug)}
        >
          {isSelected && (
            <motion.div
              layoutId="active-portal-item"
              className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10"
              initial={false}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}

          <div className="flex items-center flex-1 min-w-0 z-10 relative">
            <span className="relative flex items-center gap-2 min-w-0">
              {isSelected ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 group-hover:text-accent/80 transition-colors" />
              )}
              <span className="truncate">{collection.name}</span>
            </span>
          </div>

          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(collection.id);
              }}
              className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-0.5">{children.map((child) => renderItem(child, level + 1))}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0.5">
      {rootCollections.map((c) => renderItem(c))}
      {rootCollections.length === 0 && (
        <div className="text-text-muted text-xs text-center py-4 px-2">No pawkits yet</div>
      )}
    </div>
  );
}
