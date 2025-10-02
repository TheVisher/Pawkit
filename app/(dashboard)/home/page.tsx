import Link from "next/link";
import { countCards, recentCards } from "@/lib/server/cards";

export default async function HomePage() {
  const [counts, recent] = await Promise.all([countCards(), recentCards(6)]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-gray-100">Overview</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Ready" value={counts.ready} />
          <StatCard label="Pending" value={counts.pending} />
          <StatCard label="Error" value={counts.error} />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-gray-100">Recent</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((card) => (
            <div key={card.id} className="rounded border border-gray-800 bg-gray-900 p-4 text-sm">
              <p className="font-medium text-gray-100">{card.title || card.domain || card.url}</p>
              <p className="text-xs text-gray-500">{card.url}</p>
              <p className="text-xs text-gray-500">{card.createdAt.toLocaleDateString()}</p>
            </div>
          ))}
          {recent.length === 0 && <p className="text-sm text-gray-500">No cards yet.</p>}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-gray-100">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/library" className="rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950">
            Quick Add
          </Link>
          <Link href="/settings#data" className="rounded bg-gray-900 px-4 py-2 text-sm text-gray-100">
            Import
          </Link>
          <Link href="/settings" className="rounded bg-gray-900 px-4 py-2 text-sm text-gray-100">
            Settings
          </Link>
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
