'use client';

/**
 * Card Details Panel
 * Shown in the right sidebar when a card modal is open
 */

import { Tag, FolderOpen, Link2, Paperclip, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { LocalCard, LocalCollection } from '@/lib/db';

interface CardDetailsPanelProps {
  card: LocalCard;
  collections: LocalCollection[];
  isTransitioning: boolean;
}

export function CardDetailsPanel({ card, collections, isTransitioning }: CardDetailsPanelProps) {
  return (
    <div
      className={cn(
        'space-y-4 transition-all ease-out',
        isTransitioning
          ? 'opacity-0 translate-y-2'
          : 'opacity-100 translate-y-0'
      )}
      style={{ transitionDuration: '250ms' }}
    >
      {/* Tags Section */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Tag className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Tags</span>
        </div>
        {card.tags && card.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded-md bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">No tags</p>
        )}
      </div>

      <Separator className="bg-border-subtle" />

      {/* Pawkit (Collection) Section */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <FolderOpen className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Pawkits</span>
        </div>
        {card.collections && card.collections.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {card.collections.map((collectionSlug) => {
              const collection = collections.find(c => c.slug === collectionSlug);
              return (
                <span
                  key={collectionSlug}
                  className="px-2.5 py-1 text-xs rounded-md bg-bg-surface-2 text-text-primary border border-border-subtle"
                >
                  {collection?.name || collectionSlug}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">Not in any Pawkit</p>
        )}
      </div>

      <Separator className="bg-border-subtle" />

      {/* Backlinks Section (placeholder for Phase 7.2) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Link2 className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Backlinks</span>
        </div>
        <p className="text-xs text-text-muted italic">No backlinks yet</p>
      </div>

      <Separator className="bg-border-subtle" />

      {/* Attachments Section (placeholder) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Paperclip className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Attachments</span>
        </div>
        <p className="text-xs text-text-muted italic">No attachments</p>
      </div>

      <Separator className="bg-border-subtle" />

      {/* Kit Chat Section (placeholder) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Kit Chat</span>
        </div>
        <div className="px-3 py-4 rounded-lg bg-bg-surface-2 border border-border-subtle text-center">
          <p className="text-xs text-text-muted">AI assistant coming soon</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="pt-2 space-y-1 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>Created</span>
          <span>{new Date(card.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Updated</span>
          <span>{new Date(card.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
