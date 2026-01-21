'use client';

/**
 * Trash Page
 * Shows soft-deleted cards with options to restore or permanently delete
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/cards/empty-state';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { LocalCard } from '@/lib/db';
import { useToastStore } from '@/lib/stores/toast-store';

export default function TrashPage() {
  const [trashedCards, setTrashedCards] = useState<LocalCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  const workspace = useCurrentWorkspace();
  const loadTrashedCards = useDataStore((s) => s.loadTrashedCards);
  const restoreCard = useDataStore((s) => s.restoreCard);
  const permanentDeleteCard = useDataStore((s) => s.permanentDeleteCard);
  const emptyTrash = useDataStore((s) => s.emptyTrash);
  const toast = useToastStore((s) => s.toast);

  // Load trashed cards on mount
  useEffect(() => {
    if (!workspace) return;

    const load = async () => {
      setIsLoading(true);
      const cards = await loadTrashedCards(workspace.id);
      // Sort by deletion time (most recent first)
      cards.sort((a, b) => {
        const aTime = a._deletedAt || a._lastModified;
        const bTime = b._deletedAt || b._lastModified;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      setTrashedCards(cards);
      setIsLoading(false);
    };

    load();
  }, [workspace, loadTrashedCards]);

  const handleRestore = async (id: string) => {
    await restoreCard(id);
    setTrashedCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast({ type: 'success', message: 'Card restored' });
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    await permanentDeleteCard(id);
    setTrashedCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast({ type: 'success', message: 'Permanently deleted' });
  };

  const handleEmptyTrash = async () => {
    if (!workspace) return;
    if (!confirm(`Permanently delete all ${trashedCards.length} items in trash? This cannot be undone.`)) return;

    await emptyTrash(workspace.id);
    setTrashedCards([]);
    setSelectedIds(new Set());
    toast({ type: 'success', message: 'Trash emptied' });
  };

  const handleRestoreSelected = async () => {
    const ids = Array.from(selectedIds);

    // Track which cards were successfully restored
    const results = await Promise.allSettled(ids.map((id) => restoreCard(id).then(() => id)));

    const succeededIds = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
    );
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    // Only remove successfully restored cards from UI
    if (succeededIds.size > 0) {
      setTrashedCards((prev) => prev.filter((c) => !succeededIds.has(c.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (failedCount > 0) {
      toast({ type: 'error', message: `${failedCount} items failed to restore` });
    }
    if (succeededIds.size > 0) {
      toast({ type: 'success', message: `${succeededIds.size} items restored` });
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Permanently delete ${ids.length} items? This cannot be undone.`)) return;

    // Track which cards were successfully deleted
    const results = await Promise.allSettled(ids.map((id) => permanentDeleteCard(id).then(() => id)));

    const succeededIds = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
    );
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    // Only remove successfully deleted cards from UI
    if (succeededIds.size > 0) {
      setTrashedCards((prev) => prev.filter((c) => !succeededIds.has(c.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (failedCount > 0) {
      toast({ type: 'error', message: `${failedCount} items failed to delete` });
    }
    if (succeededIds.size > 0) {
      toast({ type: 'success', message: `${succeededIds.size} items deleted` });
    }
  };

  const toggleSelect = (id: string) => {
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
      setSelectedIds(new Set(trashedCards.map((c) => c.id)));
    }
  };

  // Calculate days until permanent deletion (30 day max)
  const getDaysRemaining = (card: LocalCard) => {
    const deletedAt = card._deletedAt || card._lastModified;
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
              const deletedAt = card._deletedAt || card._lastModified;

              return (
                <div
                  key={card.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    'bg-bg-surface-2 border border-border-subtle',
                    'hover:border-border-subtle/80',
                    selectedIds.has(card.id) && 'ring-2 ring-[var(--color-accent)]/50'
                  )}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(card.id)}
                    onChange={() => toggleSelect(card.id)}
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
                      onClick={() => handleRestore(card.id)}
                      className="h-8 px-2 text-text-muted hover:text-text-primary"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePermanentDelete(card.id)}
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
