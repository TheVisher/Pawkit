"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type CardDTO } from "@/lib/server/cards";
import { DEFAULT_USERNAME } from "@/lib/constants";
import { QuickAccessCard } from "@/components/home/quick-access-card";
import { QuickAccessPawkitCard } from "@/components/home/quick-access-pawkit-card";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CollectionNode, CardModel } from "@/lib/types";

type Counts = {
  total: number;
  ready: number;
  pending: number;
  error: number;
};

type PinnedCollection = {
  id: string;
  name: string;
  slug: string;
};

export default function HomePage() {
  const [counts, setCounts] = useState<Counts>({ total: 0, ready: 0, pending: 0, error: 0 });
  const [recent, setRecent] = useState<CardDTO[]>([]);
  const [quickAccess, setQuickAccess] = useState<CardDTO[]>([]);
  const [pinnedPawkits, setPinnedPawkits] = useState<PinnedCollection[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countsRes, recentRes, quickAccessRes, pinnedRes, collectionsRes] = await Promise.all([
          fetch("/api/cards/count"),
          fetch("/api/cards/recent?limit=5"),
          fetch("/api/cards/quick-access?limit=8"),
          fetch("/api/pawkits/pinned?limit=8"),
          fetch("/api/pawkits")
        ]);

        if (countsRes.ok) setCounts(await countsRes.json());
        if (recentRes.ok) setRecent(await recentRes.json());
        if (quickAccessRes.ok) setQuickAccess(await quickAccessRes.json());
        if (pinnedRes.ok) setPinnedPawkits(await pinnedRes.json());
        if (collectionsRes.ok) {
          const data = await collectionsRes.json();
          setCollections(data.tree);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  const recentIds = new Set(recent.map((card) => card.id));
  let quickAccessUnique = quickAccess
    .filter((item, index) => quickAccess.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => !recentIds.has(item.id));

  if (quickAccessUnique.length === 0) {
    quickAccessUnique = quickAccess.filter((item, index) => {
      return quickAccess.findIndex((candidate) => candidate.id === item.id) === index;
    });
  }

  const activeCard = activeCardId ? recent.find((c) => c.id === activeCardId) : null;

  const handleUpdateCard = (updated: CardModel) => {
    setRecent((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCard = () => {
    setRecent((prev) => prev.filter((c) => c.id !== activeCardId));
    setActiveCardId(null);
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
  card: CardDTO;
  onClick: () => void;
};

function RecentCard({ card, onClick }: CardProps) {
  return (
    <article
      onClick={onClick}
      className="rounded border border-gray-800 bg-gray-900 p-4 cursor-pointer transition hover:border-accent/60"
    >
      {card.image && (
        <div className="mb-3 overflow-hidden rounded bg-gray-800">
          <img src={card.image} alt={card.title ?? card.url} className="h-32 w-full object-cover" loading="lazy" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-100 truncate" title={card.title ?? card.url}>
        {card.title || card.domain || card.url}
      </p>
      <p className="mt-1 text-xs text-gray-500 truncate">{card.url}</p>
      <p className="mt-3 text-xs text-gray-500">Added {formatDate(card.createdAt)}</p>
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
