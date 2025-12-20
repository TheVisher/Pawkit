'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Globe, FileText, StickyNote, Pin } from 'lucide-react';
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

  const hasImage = card.image && !imageError;
  const hasFavicon = card.favicon && !imageError;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden',
        'transition-all duration-200 ease-out',
        'hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950',
        isListView ? 'flex items-center gap-4 p-3' : 'flex flex-col'
      )}
    >
      {/* Thumbnail / Image */}
      {!isListView && (
        <div className="relative aspect-[16/10] bg-zinc-800 overflow-hidden">
          {hasImage ? (
            <Image
              src={card.image!}
              alt={card.title || 'Card thumbnail'}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <Icon className="h-12 w-12 text-zinc-600" />
            </div>
          )}

          {/* Pinned indicator */}
          {card.pinned && (
            <div className="absolute top-2 right-2 p-1 rounded-full bg-purple-600/90 text-white">
              <Pin className="h-3 w-3" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 min-w-0', isListView ? '' : 'p-3')}>
        {/* Favicon + Domain (list view) */}
        {isListView && (
          <div className="flex-shrink-0 mr-3">
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
              <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center">
                <Icon className="h-3 w-3 text-zinc-500" />
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            'font-medium text-zinc-100 truncate',
            'group-hover:text-purple-300 transition-colors',
            isListView ? 'text-sm' : 'text-sm mb-1'
          )}
        >
          {card.title || 'Untitled'}
        </h3>

        {/* Domain / URL */}
        {domain && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            {!isListView && hasFavicon && (
              <Image
                src={card.favicon!}
                alt=""
                width={12}
                height={12}
                className="rounded-sm"
                onError={() => setImageError(true)}
              />
            )}
            {!isListView && !hasFavicon && (
              <Globe className="h-3 w-3" />
            )}
            <span className="truncate">{domain}</span>
          </div>
        )}

        {/* Description (grid view only) */}
        {!isListView && card.description && (
          <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className={cn('flex flex-wrap gap-1', isListView ? 'ml-auto' : 'mt-2')}>
            {card.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-800 text-zinc-400"
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-800 text-zinc-500">
                +{card.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
          'bg-gradient-to-t from-purple-500/5 to-transparent'
        )}
      />
    </button>
  );
}
