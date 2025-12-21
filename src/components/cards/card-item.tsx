'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Globe, FileText, StickyNote, Pin, Loader2 } from 'lucide-react';
import type { LocalCard } from '@/lib/db';
import { cn } from '@/lib/utils';

interface CardItemProps {
  card: LocalCard;
  variant?: 'grid' | 'list';
  onClick?: () => void;
}

function getCardIcon(type: string) {
  switch (type) {
    case 'url':
      return Globe;
    case 'md-note':
    case 'text-note':
      return FileText;
    case 'quick-note':
      return StickyNote;
    default:
      return Globe;
  }
}

function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function CardItem({ card, variant = 'grid', onClick }: CardItemProps) {
  const [imageError, setImageError] = useState(false);
  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
  const isListView = variant === 'list';
  const isSyncing = !card._synced;

  const hasImage = card.image && !imageError;
  const hasFavicon = card.favicon && !imageError;

  // Grid view - vertical card with thumbnail on top
  if (!isListView) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'group relative text-left rounded-2xl overflow-hidden',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-1',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'focus:ring-offset-[var(--bg-base)]'
        )}
        style={{
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Colored blur background effect - uses thumbnail as blurred background */}
        {hasImage && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <Image
              src={card.image!}
              alt=""
              fill
              className="object-cover scale-110 blur-3xl opacity-30 saturate-150"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Card content container */}
        <div className="relative flex flex-col backdrop-blur-sm">
          {/* Thumbnail / Image */}
          <div className="relative aspect-[16/10] overflow-hidden">
            {hasImage ? (
              <Image
                src={card.image!}
                alt={card.title || 'Card thumbnail'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, var(--bg-surface-2) 0%, var(--bg-surface-3) 100%)`,
                }}
              >
                {hasFavicon ? (
                  <Image
                    src={card.favicon!}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-lg"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Icon className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            )}

            {/* Pinned indicator */}
            {card.pinned && (
              <div
                className="absolute top-2 right-2 p-1.5 rounded-full"
                style={{
                  background: 'hsla(var(--accent-h) var(--accent-s) var(--accent-l) / 0.9)',
                  color: 'white',
                }}
              >
                <Pin className="h-3 w-3" />
              </div>
            )}

            {/* Syncing indicator */}
            {isSyncing && (
              <div
                className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Syncing</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Title */}
            <h3
              className={cn(
                'font-medium text-sm line-clamp-2 transition-colors',
                'group-hover:text-[var(--ds-accent)]'
              )}
              style={{ color: 'var(--text-primary)' }}
            >
              {card.title || 'Untitled'}
            </h3>

            {/* Domain / URL */}
            {domain && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {hasFavicon ? (
                  <Image
                    src={card.favicon!}
                    alt=""
                    width={12}
                    height={12}
                    className="rounded-sm"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                <span className="truncate">{domain}</span>
              </div>
            )}

            {/* Tags */}
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                    style={{
                      background: 'var(--bg-surface-1)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {card.tags.length > 3 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                    style={{
                      background: 'var(--bg-surface-1)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    +{card.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hover glow effect */}
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl'
          )}
          style={{
            boxShadow: '0 0 30px hsla(var(--accent-h) var(--accent-s) 50% / 0.3), 0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        />

        {/* Border highlight on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
          }}
        />
      </button>
    );
  }

  // List view - horizontal compact row
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left w-full rounded-xl overflow-hidden',
        'flex items-center gap-4 p-3',
        'transition-all duration-200 ease-out',
        'hover:translate-x-1',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'focus:ring-offset-[var(--bg-base)]'
      )}
      style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-subtle)',
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
            className="rounded"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: 'var(--bg-surface-1)' }}
          >
            <Icon className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'flex-1 font-medium text-sm truncate transition-colors',
          'group-hover:text-[var(--ds-accent)]'
        )}
        style={{ color: 'var(--text-primary)' }}
      >
        {card.title || 'Untitled'}
      </h3>

      {/* Domain */}
      {domain && (
        <span className="text-xs truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>
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
        <Pin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ds-accent)' }} />
      )}

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex gap-1">
          {card.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{
                background: 'var(--bg-surface-1)',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{
                background: 'var(--bg-surface-1)',
                color: 'var(--text-muted)',
              }}
            >
              +{card.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Hover border */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
        }}
      />
    </button>
  );
}
