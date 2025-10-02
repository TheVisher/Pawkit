import Link from "next/link";
import { countCards, quickAccessCards, recentCards, type CardDTO } from "@/lib/server/cards";
import { DEFAULT_USERNAME } from "@/lib/constants";

export default async function HomePage() {
  const [counts, recent, quickAccess] = await Promise.all([
    countCards(),
    recentCards(5),
    quickAccessCards(4)
  ]);

  const recentIds = new Set(recent.map((card) => card.id));
  let quickAccessUnique = quickAccess
    .filter((item, index) => quickAccess.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => !recentIds.has(item.id));

  if (quickAccessUnique.length === 0) {
    quickAccessUnique = quickAccess.filter((item, index) => {
      return quickAccess.findIndex((candidate) => candidate.id === item.id) === index;
    });
  }

  return (
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
              <RecentCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <EmptyState message="Add your first bookmark to see it here." />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">Quick Access</h2>
          <Link href="/library?layout=compact" className="text-sm text-accent hover:text-accent/80">
            Manage shortcuts
          </Link>
        </div>
        {quickAccessUnique.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {quickAccessUnique.map((item) => (
              <QuickAccessCard key={item.id} card={item} />
            ))}
          </div>
        ) : (
          <EmptyState message="Pin a card or collection to surface it here." />
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
};

function RecentCard({ card }: CardProps) {
  return (
    <article className="rounded border border-gray-800 bg-gray-900 p-4">
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

function QuickAccessCard({ card }: CardProps) {
  return (
    <article className="flex h-full flex-col justify-between rounded border border-gray-800 bg-gray-900 p-4">
      {card.image && (
        <div className="mb-3 overflow-hidden rounded bg-gray-800">
          <img src={card.image} alt={card.title ?? card.url} className="h-24 w-full object-cover" loading="lazy" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-100 truncate" title={card.title ?? card.url}>
          {card.title || card.domain || card.url}
        </p>
        <p className="mt-1 text-xs text-gray-500 truncate">{card.url}</p>
      </div>
      <p className="mt-4 text-xs text-gray-500">Updated {formatDate(card.updatedAt)}</p>
    </article>
  );
}

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return <p className="rounded border border-dashed border-gray-800 bg-gray-950 p-6 text-sm text-gray-500">{message}</p>;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
