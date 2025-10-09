"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { QuickAccessCard } from "@/components/home/quick-access-card";
import { QuickAccessPawkitCard } from "@/components/home/quick-access-pawkit-card";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CardModel, CollectionNode } from "@/lib/types";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, startOfDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CardModel;
};

const GREETINGS = [
  "Welcome back",
  "Hey there",
  "Good to see you",
  "Happy to see you",
  "Great to have you back"
];

export default function DemoHomePage() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // Read from demo store
  const { cards, collections, updateCard, deleteCard } = useDemoAwareStore();

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

  const recentIds = new Set(recent.map(card => card.id));
  let quickAccessUnique = quickAccess.filter(item => !recentIds.has(item.id));

  if (quickAccessUnique.length === 0) {
    quickAccessUnique = quickAccess;
  }

  // Calendar events for 7-day view
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return cards
      .filter((card) => card.scheduledDate && !card.inDen)
      .map((card) => {
        const dateStr = card.scheduledDate!.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const cardDate = new Date(year, month - 1, day);
        return {
          id: card.id,
          title: card.title || card.domain || card.url,
          start: cardDate,
          end: cardDate,
          resource: card,
        };
      });
  }, [cards]);

  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 6);

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
            {greeting}, welcome to the demo!
          </h1>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-100">Recent Items</h2>
            <Link href="/demo/library" className="text-sm text-accent hover:text-accent/80">
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
                    const updates: { collections: string[]; inDen?: boolean } = { collections };
                    if (card.inDen) {
                      updates.inDen = false;
                    }
                    await updateCard(card.id, updates);
                  }}
                  onAddToDen={async () => {
                    await updateCard(card.id, { inDen: true });
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
          <Link href="/demo/pawkits" className="text-sm text-accent hover:text-accent/80">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">This Week</h2>
          <Link href="/demo/calendar" className="text-sm text-accent hover:text-accent/80">
            View full calendar
          </Link>
        </div>
        <div className="calendar-container rounded-2xl border border-subtle bg-surface p-6">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view="week"
            date={today}
            toolbar={false}
            onSelectEvent={(event: CalendarEvent) => setActiveCardId(event.id)}
            components={{
              event: ({ event }: { event: CalendarEvent }) => {
                const card = event.resource;
                return (
                  <div className="flex items-center gap-1 overflow-hidden text-xs">
                    {card.image && (
                      <div className="h-4 w-4 flex-shrink-0 overflow-hidden rounded">
                        <img src={card.image} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <span className="truncate">{event.title}</span>
                  </div>
                );
              },
            }}
            style={{ height: 400 }}
            className="pawkit-calendar"
          />
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
        <div className="mb-3 overflow-hidden rounded-xl bg-surface-soft">
          <img src={card.image} alt={card.title ?? card.url} className="h-32 w-full object-cover" loading="lazy" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground truncate" title={card.title ?? card.url}>
          {card.title || card.domain || card.url}
        </p>
        <p className="mt-1 text-xs text-muted-foreground truncate">{card.url}</p>
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
