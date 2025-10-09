"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { DEFAULT_USERNAME } from "@/lib/constants";
import { QuickAccessCard } from "@/components/home/quick-access-card";
import { QuickAccessPawkitCard } from "@/components/home/quick-access-pawkit-card";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CardModel, CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { format, addDays, startOfDay } from "date-fns";

const GREETINGS = [
  "Welcome back",
  "Hey there",
  "Good to see you",
  "Happy to see you",
  "Great to have you back"
];

export default function HomePage() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // Read from global store - instant, no API calls
  const { cards, collections, updateCard, deleteCard } = useDataStore();

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setDisplayName(data.displayName);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // Compute views from the single source of truth
  const recent = useMemo(() =>
    cards
      .filter(c => !c.inDen) // Exclude Den cards
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [cards]
  );

  const quickAccess = useMemo(() =>
    cards
      .filter(c => c.pinned && !c.inDen) // Exclude Den cards
      .slice(0, 8),
    [cards]
  );

  // Get pinned pawkits from collections (flatten tree and filter)
  const pinnedPawkits = useMemo(() => {
    const flattenCollections = (nodes: CollectionNode[]): CollectionNode[] => {
      return nodes.reduce<CollectionNode[]>((acc, node) => {
        acc.push(node);
        if (node.children.length > 0) {
          acc.push(...flattenCollections(node.children));
        }
        return acc;
      }, []);
    };

    return flattenCollections(collections)
      .filter(c => c.pinned)
      .slice(0, 8);
  }, [collections]);

  // Get the week starting from Monday
  const weekDays = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
    const monday = addDays(startOfDay(now), diff);

    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

    cards
      .filter((card) => card.scheduledDate && !card.inDen)
      .forEach((card) => {
        const dateStr = card.scheduledDate!.split('T')[0];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(card);
      });

    return map;
  }, [cards]);

  const recentIds = new Set(recent.map(card => card.id));
  let quickAccessUnique = quickAccess.filter(item => !recentIds.has(item.id));

  if (quickAccessUnique.length === 0) {
    quickAccessUnique = quickAccess;
  }

  const activeCard = activeCardId ? cards.find(c => c.id === activeCardId) : null;

  const handleUpdateCard = async (updated: CardModel) => {
    await updateCard(updated.id, updated);
  };

  const handleDeleteCard = async () => {
    if (activeCardId) {
      await deleteCard(activeCardId);
      setActiveCardId(null);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-12 pb-16">
        <section className="text-center">
          <h1 className="text-4xl font-semibold text-gray-100 sm:text-5xl">
            <span className="mr-3 inline-block" aria-hidden="true">👋</span>
            {displayName ? `${greeting}, ${displayName}` : "Welcome to Pawkit!"}
          </h1>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-100">Recent Items</h2>
            <Link href="/library" className="text-sm text-accent hover:text-accent/80">
              View library
            </Link>
          </div>
          {recent.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recent.map((card) => (
                <RecentCard
                  key={card.id}
                  card={card}
                  onClick={() => setActiveCardId(card.id)}
                  onAddToPawkit={async (slug) => {
                    const collections = Array.from(new Set([slug, ...(card.collections || [])]));
                    // If card is in The Den, remove it when adding to regular Pawkit
                    const updates: { collections: string[]; inDen?: boolean } = { collections };
                    if (card.inDen) {
                      updates.inDen = false;
                    }
                    await updateCard(card.id, updates);
                  }}
                  onAddToDen={async () => {
                    const response = await fetch(`/api/cards/${card.id}/move-to-den`, {
                      method: "PATCH",
                    });
                    if (response.ok) {
                      // Card moved to Den, refresh the page data
                      window.location.reload();
                    }
                  }}
                  onDeleteCard={async () => {
                    await deleteCard(card.id);
                  }}
                  onRemoveFromPawkit={async (slug) => {
                    const collections = (card.collections || []).filter(s => s !== slug);
                    await updateCard(card.id, { collections });
                  }}
                  onRemoveFromAllPawkits={async () => {
                    await updateCard(card.id, { collections: [] });
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Add your first bookmark to see it here." />
          )}
        </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">Quick Access</h2>
          <Link href="/pawkits" className="text-sm text-accent hover:text-accent/80">
            Manage shortcuts
          </Link>
        </div>
        {(pinnedPawkits.length > 0 || quickAccessUnique.length > 0) ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {pinnedPawkits.map((pawkit) => (
              <QuickAccessPawkitCard key={pawkit.id} pawkit={pawkit} />
            ))}
            {quickAccessUnique.map((item) => (
              <QuickAccessCard key={item.id} card={item} />
            ))}
          </div>
        ) : (
          <EmptyState message="Pin cards or Pawkits to surface them here." />
        )}
      </section>

      <section className="mt-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">This Week</h2>
          <Link href="/calendar" className="text-sm text-accent hover:text-accent/80">
            View full calendar
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayCards = cardsByDate.get(dateStr) || [];
            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

            return (
              <div
                key={dateStr}
                className={`rounded-2xl border bg-surface p-4 min-h-[200px] flex flex-col ${
                  isToday ? 'border-accent' : 'border-subtle'
                }`}
              >
                <div className="text-center mb-3">
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-2xl font-semibold ${isToday ? 'text-accent' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-2 flex-1">
                  {dayCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => setActiveCardId(card.id)}
                      className="w-full text-left p-2 rounded-lg bg-surface-soft hover:bg-surface-soft/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {card.image && (
                          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded">
                            <img src={card.image} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <p className="text-xs font-medium text-foreground truncate flex-1">
                          {card.title || card.domain || card.url}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </div>

      {activeCard && (
        <CardDetailModal
          card={activeCard as CardModel}
          collections={collections}
          onClose={() => setActiveCardId(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}
    </>
  );
}

type CardProps = {
  card: CardModel;
  onClick: () => void;
  onAddToPawkit: (slug: string) => void;
  onAddToDen: () => void;
  onDeleteCard: () => void;
  onRemoveFromPawkit: (slug: string) => void;
  onRemoveFromAllPawkits: () => void;
};

function RecentCard({ card, onClick, onAddToPawkit, onAddToDen, onDeleteCard, onRemoveFromPawkit, onRemoveFromAllPawkits }: CardProps) {
  return (
    <CardContextMenuWrapper
      onAddToPawkit={onAddToPawkit}
      onAddToDen={onAddToDen}
      onDelete={onDeleteCard}
      cardCollections={card.collections || []}
      onRemoveFromPawkit={onRemoveFromPawkit}
      onRemoveFromAllPawkits={onRemoveFromAllPawkits}
    >
      <article
        onClick={onClick}
        className="card-hover flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-subtle bg-surface p-4 transition"
      >
      {card.image && (
        <div className="mb-3 overflow-hidden rounded-xl bg-surface-soft relative">
          <img src={card.image} alt={card.title ?? card.url} className="h-32 w-full object-cover" loading="lazy" />
          {/* URL Pill Overlay */}
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors flex items-center justify-center"
            >
              <span className="truncate max-w-full">
                {card.domain || new URL(card.url).hostname}
              </span>
            </a>
          )}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground line-clamp-2" title={card.title ?? card.url}>
          {card.title || card.domain || card.url}
        </p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground/80">Added {formatDate(card.createdAt)}</p>
    </article>
    </CardContextMenuWrapper>
  );
}


type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return <p className="rounded border border-dashed border-gray-800 bg-gray-950 p-6 text-sm text-gray-500">{message}</p>;
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
