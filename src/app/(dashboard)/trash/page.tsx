'use client';

/**
 * Trash Page
 * Shows soft-deleted cards with options to restore or permanently delete
 */

import { useState, useMemo, useRef } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { useDeletedCards } from '@/lib/hooks/use-deleted-cards';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/cards/empty-state';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Card, Id } from '@/lib/types/convex';
import { useToastStore } from '@/lib/stores/toast-store';

export default function TrashPage() {
  const [selectedIds, setSelectedIds] = useState<Set<Id<'cards'>>>(new Set());
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  const { deletedCards: rawDeletedCards, isLoading } = useDeletedCards();
  const { restoreCard, permanentDeleteCard } = useMutations();
  const toast = useToastStore((s) => s.toast);

  // Sort by deletion time (most recent first)
  const trashedCards = useMemo(() => {
    return [...rawDeletedCards].sort((a, b) => {
      const aTime = a.deletedAt || a.updatedAt;
      const bTime = b.deletedAt || b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [rawDeletedCards]);

  const handleRestore = async (id: Id<'cards'>) => {
    try {
      await restoreCard(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ type: 'success', message: 'Card restored' });
    } catch (error) {
      toast({ type: 'error', message: 'Failed to restore card' });
    }
  };

  const handlePermanentDelete = async (id: Id<'cards'>) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    try {
      await permanentDeleteCard(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ type: 'success', message: 'Permanently deleted' });
    } catch (error) {
      toast({ type: 'error', message: 'Failed to delete card' });
    }
  };

  const handleEmptyTrash = async () => {
    if (trashedCards.length === 0) return;
    if (!confirm(`Permanently delete all ${trashedCards.length} items in trash? This cannot be undone.`)) return;

    // Delete all cards one by one (Convex doesn't have emptyTrash in unified mutations yet)
    const results = await Promise.allSettled(
      trashedCards.map((card) => permanentDeleteCard(card._id))
    );

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    const succeededCount = results.filter((r) => r.status === 'fulfilled').length;

    setSelectedIds(new Set());

    if (failedCount > 0) {
      toast({ type: 'error', message: `${failedCount} items failed to delete` });
    }
    if (succeededCount > 0) {
      toast({ type: 'success', message: 'Trash emptied' });
    }
  };

  const handleRestoreSelected = async () => {
    const ids = Array.from(selectedIds);

    const results = await Promise.allSettled(ids.map((id) => restoreCard(id)));

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    const succeededCount = results.filter((r) => r.status === 'fulfilled').length;

    // Clear selection for succeeded items
    setSelectedIds(new Set());

    if (failedCount > 0) {
      toast({ type: 'error', message: `${failedCount} items failed to restore` });
    }
    if (succeededCount > 0) {
      toast({ type: 'success', message: `${succeededCount} items restored` });
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Permanently delete ${ids.length} items? This cannot be undone.`)) return;

    const results = await Promise.allSettled(ids.map((id) => permanentDeleteCard(id)));

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    const succeededCount = results.filter((r) => r.status === 'fulfilled').length;

    // Clear selection
    setSelectedIds(new Set());

    if (failedCount > 0) {
      toast({ type: 'error', message: `${failedCount} items failed to delete` });
    }
    if (succeededCount > 0) {
      toast({ type: 'success', message: `${succeededCount} items deleted` });
    }
  };

  const toggleSelect = (id: Id<'cards'>) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === trashedCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trashedCards.map((c) => c._id)));
    }
  };

  // Calculate days until permanent deletion (30 day max)
  const getDaysRemaining = (card: Card) => {
    const deletedAt = card.deletedAt || card.updatedAt;
    if (!deletedAt) return 30;
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  if (isLoading) {
    return (
      <div className="flex-1">
        <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
          <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
            <div className="flex items-start justify-between gap-4">
              <div ref={headerRef} className="w-fit space-y-0.5">
                <div className="text-xs text-text-muted">Loading...</div>
                <h1 className="text-2xl font-semibold text-text-primary">Trash</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header */}
      <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
        <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
          <div className="flex items-start justify-between gap-4">
            <div ref={headerRef} className="w-fit space-y-0.5">
              <div className="text-xs text-text-muted">
                {trashedCards.length} {trashedCards.length === 1 ? 'item' : 'items'}
              </div>
              <h1 className="text-2xl font-semibold text-text-primary">Trash</h1>
            </div>

            {trashedCards.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {selectedIds.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreSelected}
                      className="text-text-secondary"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore ({selectedIds.size})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedIds.size})
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEmptyTrash}
                >
                  Empty Trash
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 pt-4 pb-6">
        {trashedCards.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="Trash is empty"
            description="Items you delete will appear here for 30 days before being permanently removed."
          />
        ) : (
          <div className="space-y-2">
            {/* Select all header */}
            <div className="flex items-center gap-3 py-2 px-3 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={selectedIds.size === trashedCards.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-border-subtle"
              />
              <span>Select all</span>
            </div>

            {/* Trashed items list */}
            {trashedCards.map((card) => {
              const daysRemaining = getDaysRemaining(card);
              const deletedAt = card.deletedAt || card.updatedAt;

              return (
                <div
                  key={card._id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    'bg-bg-surface-2 border border-border-subtle',
                    'hover:border-border-subtle/80',
                    selectedIds.has(card._id) && 'ring-2 ring-[var(--color-accent)]/50'
                  )}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(card._id)}
                    onChange={() => toggleSelect(card._id)}
                    className="h-4 w-4 rounded border-border-subtle shrink-0"
                  />

                  {/* Favicon/icon */}
                  {card.favicon ? (
                    <img
                      src={card.favicon}
                      alt=""
                      className="w-5 h-5 rounded shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-bg-surface-3 shrink-0" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">
                      {card.title || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {card.domain && (
                        <>
                          <span className="truncate">{card.domain}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>Deleted {deletedAt && formatDistanceToNow(new Date(deletedAt), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Days remaining badge */}
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0',
                    daysRemaining <= 7
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-bg-surface-3 text-text-muted'
                  )}>
                    <Clock className="h-3 w-3" />
                    {daysRemaining}d
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(card._id)}
                      className="h-8 px-2 text-text-muted hover:text-text-primary"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePermanentDelete(card._id)}
                      className="h-8 px-2 text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-text-primary font-medium">Items are automatically deleted after 30 days</p>
                <p className="text-text-muted mt-1">
                  Restore items you want to keep before they are permanently removed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
