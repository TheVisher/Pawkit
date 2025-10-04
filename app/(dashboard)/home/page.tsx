"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DEFAULT_USERNAME } from "@/lib/constants";
import { QuickAccessCard } from "@/components/home/quick-access-card";
import { QuickAccessPawkitCard } from "@/components/home/quick-access-pawkit-card";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CardModel } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";

export default function HomePage() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Read from global store - instant, no API calls
  const { cards, collections, updateCard, deleteCard } = useDataStore();

  // Compute views from the single source of truth
  const recent = useMemo(() =>
    cards
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [cards]
  );

  const quickAccess = useMemo(() =>
    cards
      .filter(c => c.pinned)
      .slice(0, 8),
    [cards]
  );

  // Note: CollectionNode doesn't have pinned property yet
  // For now, return empty array until pinned feature is implemented
  const pinnedPawkits = useMemo(() => [], []);

  const counts = useMemo(() => ({
    total: cards.length,
    ready: cards.filter(c => c.status === 'READY').length,
    pending: cards.filter(c => c.status === 'PENDING').length,
    error: cards.filter(c => c.status === 'ERROR').length
  }), [cards]);

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
            Welcome back, {DEFAULT_USERNAME}
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
                <RecentCard key={card.id} card={card} onClick={() => setActiveCardId(card.id)} />
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
        <h2 className="text-xl font-semibold text-gray-100">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Ready" value={counts.ready} />
          <StatCard label="Pending" value={counts.pending} />
          <StatCard label="Error" value={counts.error} />
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

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-100">{value}</p>
    </div>
  );
}

type CardProps = {
  card: CardModel;
  onClick: () => void;
};

function RecentCard({ card, onClick }: CardProps) {
  return (
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
