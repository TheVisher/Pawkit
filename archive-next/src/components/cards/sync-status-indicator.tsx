'use client';

/**
 * SyncStatusIndicator
 * Shows sync status for a card: syncing, queued, or failed
 */

import { Loader2, CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { useSyncStore } from '@/lib/stores/sync-store';
import { forceSyncEntity } from '@/lib/services/sync-queue';
import { cn } from '@/lib/utils';

export type CardSyncStatus = 'synced' | 'queued' | 'syncing' | 'failed';

interface SyncStatusIndicatorProps {
  cardId: string;
  isSynced: boolean; // card._synced
  variant?: 'pill' | 'icon'; // pill for grid, icon for list
  className?: string;
}

export function SyncStatusIndicator({
  cardId,
  isSynced,
  variant = 'pill',
  className,
}: SyncStatusIndicatorProps) {
  // Check if this specific card is actively syncing
  const isActivelySyncing = useSyncStore((state) =>
    state.activelySyncingIds.has(cardId)
  );

  // Check if this card's sync has failed
  const isFailed = useSyncStore((state) =>
    state.failedEntityIds.has(cardId)
  );

  // Determine status
  let status: CardSyncStatus;
  if (isSynced) {
    status = 'synced';
  } else if (isFailed) {
    status = 'failed';
  } else if (isActivelySyncing) {
    status = 'syncing';
  } else {
    status = 'queued';
  }

  // Don't show anything if synced
  if (status === 'synced') {
    return null;
  }

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await forceSyncEntity(cardId);
  };

  // Icon-only variant (for list view)
  if (variant === 'icon') {
    return (
      <div
        className={cn('flex items-center', className)}
        title={
          status === 'syncing'
            ? 'Syncing...'
            : status === 'queued'
              ? 'Waiting to sync'
              : 'Sync failed - click to retry'
        }
      >
        {status === 'syncing' && (
          <Loader2
            className="h-3 w-3 animate-spin"
            style={{ color: 'var(--color-text-muted)' }}
          />
        )}
        {status === 'queued' && (
          <Cloud
            className="h-3 w-3"
            style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
          />
        )}
        {status === 'failed' && (
          <button
            onClick={handleRetry}
            className="hover:opacity-80 transition-opacity"
          >
            <CloudOff
              className="h-3 w-3"
              style={{ color: '#ef4444' }}
            />
          </button>
        )}
      </div>
    );
  }

  // Pill variant (for grid view)
  const pillStyles = {
    syncing: {
      background: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
    },
    queued: {
      background: 'rgba(0, 0, 0, 0.4)',
      color: 'rgba(255, 255, 255, 0.8)',
    },
    failed: {
      background: 'rgba(239, 68, 68, 0.9)',
      color: 'white',
    },
  };

  const style = pillStyles[status];

  return (
    <div
      className={cn(
        'absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        status === 'failed' && 'cursor-pointer hover:opacity-90',
        className
      )}
      style={{
        background: style.background,
        backdropFilter: 'blur(8px)',
        color: style.color,
      }}
      onClick={status === 'failed' ? handleRetry : undefined}
      title={
        status === 'syncing'
          ? 'Syncing to server...'
          : status === 'queued'
            ? 'Waiting to sync'
            : 'Sync failed - click to retry'
      }
    >
      {status === 'syncing' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Syncing</span>
        </>
      )}
      {status === 'queued' && (
        <>
          <Cloud className="h-3 w-3" />
          <span>Queued</span>
        </>
      )}
      {status === 'failed' && (
        <>
          <RefreshCw className="h-3 w-3" />
          <span>Retry</span>
        </>
      )}
    </div>
  );
}
