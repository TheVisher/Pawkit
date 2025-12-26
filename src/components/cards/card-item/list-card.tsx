'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Pin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalCard } from '@/lib/db';
import {
  type CardDisplaySettings,
  DEFAULT_CARD_DISPLAY,
  getCardIcon,
  getDomain,
} from './types';

interface ListCardProps {
  card: LocalCard;
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
}

/**
 * List card component - horizontal compact row
 */
export function ListCard({
  card,
  onClick,
  displaySettings = {},
}: ListCardProps) {
  const [imageError, setImageError] = useState(false);
  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
  const isSyncing = !card._synced;

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
            <Icon className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
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
          style={{ color: 'var(--text-primary)' }}
        >
          {card.title || 'Untitled'}
        </h3>
      )}

      {/* Domain - Pill shaped */}
      {settings.showUrlPill && domain && (
        <span
          className="px-2 py-0.5 rounded-full text-xs truncate max-w-[150px]"
          style={{
            background: 'var(--glass-bg)',
            color: 'var(--text-muted)',
          }}
        >
          {domain}
        </span>
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      )}

      {/* Pinned */}
      {card.pinned && (
        <Pin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
      )}

      {/* Tags - Pill shaped */}
      {settings.showTags && card.tags && card.tags.length > 0 && (
        <div className="flex gap-1">
          {card.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full"
              style={{
                background: 'var(--glass-bg)',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span
              className="px-2 py-0.5 text-[10px] font-medium rounded-full"
              style={{
                background: 'var(--glass-bg)',
                color: 'var(--text-muted)',
              }}
            >
              +{card.tags.length - 2}
            </span>
          )}
        </div>
      )}

    </button>
  );
}
