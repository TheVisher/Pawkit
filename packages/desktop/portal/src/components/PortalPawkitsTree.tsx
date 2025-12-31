/**
 * Portal-specific Pawkits tree
 * Similar to main app's PawkitsTree but uses click handlers for selection
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortalDataStore, type LocalCollection } from '../stores/portal-stores';
import { PortalPawkitItem } from './PortalPawkitItem';

interface PortalPawkitsTreeProps {
  selectedSlug: string | null;
  onSelectPawkit: (slug: string | null) => void;
  // External drag targeting
  isExternalDragActive?: boolean;
  dropTargetSlug?: string | null;
  onExternalDragHover?: (slug: string | null) => void;
}

export function PortalPawkitsTree({
  selectedSlug,
  onSelectPawkit,
  isExternalDragActive = false,
  dropTargetSlug = null,
  onExternalDragHover,
}: PortalPawkitsTreeProps) {
  const collections = usePortalDataStore((state) => state.collections);
  const cards = usePortalDataStore((state) => state.cards);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure
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

  // Count cards in each collection
  const getCardCount = (collectionSlug: string) => {
    return cards.filter(
      (c) => !c._deleted && c.collections?.includes(collectionSlug)
    ).length;
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
        <PortalPawkitItem
          collection={collection}
          childCollections={children}
          level={level}
          isExpanded={isExpanded}
          isSelected={isSelected}
          onToggleExpand={toggleExpand}
          onSelect={onSelectPawkit}
          cardCount={getCardCount(collection.slug)}
          isExternalDragActive={isExternalDragActive}
          isDropTarget={isDropTarget}
          onExternalDragHover={onExternalDragHover}
        />
        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-0.5">
                {children.map((child) => renderItem(child, level + 1))}
              </div>
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
        <div className="text-text-muted text-xs text-center py-4 px-2">
          No pawkits yet
        </div>
      )}
    </div>
  );
}
