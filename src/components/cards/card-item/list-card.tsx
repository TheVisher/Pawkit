'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Pin } from 'lucide-react';
import { SyncStatusIndicator } from '@/components/cards/sync-status-indicator';
import { cn } from '@/lib/utils';
import type { LocalCard } from '@/lib/db';
import {
  type CardDisplaySettings,
  DEFAULT_CARD_DISPLAY,
  getCardIcon,
} from './types';
import { TagBadgeList } from '@/components/tags/tag-badge';
import { getSystemTagsForCard, type SystemTag } from '@/lib/utils/system-tags';

interface ListCardProps {
  card: LocalCard;
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
}

/**
 * List card component - horizontal compact row
 */
export function ListCard({
  card,
  onClick,
  displaySettings = {},
  onTagClick,
  onSystemTagClick,
}: ListCardProps) {
  const [imageError, setImageError] = useState(false);
  const Icon = getCardIcon(card.type);

  // Merge with defaults
  const settings: CardDisplaySettings = { ...DEFAULT_CARD_DISPLAY, ...displaySettings };

  const hasFavicon = card.favicon && !imageError;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left w-full rounded-xl overflow-hidden',
        'flex items-center gap-4 p-3',
        'transition-all duration-200 ease-out',
        'hover:translate-x-1',
        'focus:outline-none'
      )}
      style={{
        background: 'var(--glass-panel-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Favicon / Icon */}
      <div className="flex-shrink-0">
        {hasFavicon ? (
          <Image
            src={card.favicon!}
            alt=""
            width={20}
            height={20}
            className="rounded-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--glass-bg)' }}
          >
            <Icon className="h-3 w-3" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}
      </div>

      {/* Title */}
      {settings.showTitles && (
        <h3
          className={cn(
            'flex-1 font-medium text-sm truncate transition-colors',
            'group-hover:text-[var(--color-accent)]'
          )}
          style={{ color: 'var(--color-text-primary)' }}
        >
          {card.title || 'Untitled'}
        </h3>
      )}

      {/* Sync status indicator */}
      <SyncStatusIndicator
        cardId={card.id}
        isSynced={card._synced}
        variant="icon"
      />

      {/* Pinned */}
      {card.pinned && (
        <Pin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
      )}

      {/* Tags - system tags (read, scheduled, reading time) + user tags */}
      {settings.showTags && (() => {
        const systemTags = getSystemTagsForCard(card);
        const userTags = card.tags || [];
        // Show tags section if we have any tags (system or user)
        if (systemTags.length === 0 && userTags.length === 0) return null;
        return (
          <TagBadgeList
            tags={userTags}
            systemTags={systemTags}
            maxVisible={3}
            size="sm"
            showLeafOnly
            onTagClick={onTagClick}
            onSystemTagClick={onSystemTagClick}
          />
        );
      })()}

    </button>
  );
}
