"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Collection } from "@prisma/client";

type QuickAccessPawkitCardProps = {
  pawkit: Collection;
};

export function QuickAccessPawkitCard({ pawkit }: QuickAccessPawkitCardProps) {
  const [isPinned, setIsPinned] = useState(pawkit.pinned);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/pawkits/${pawkit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !isPinned })
      });

      if (response.ok) {
        setIsPinned(!isPinned);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/pawkits/${pawkit.slug}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className="card-hover group relative flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-subtle bg-surface p-4 transition"
    >
      <button
        onClick={handlePinToggle}
        disabled={isLoading}
        className="absolute top-2 right-2 z-10 rounded bg-surface-soft/80 p-1.5 text-muted-foreground opacity-0 transition hover:bg-surface-soft hover:text-accent group-hover:opacity-100"
        title={isPinned ? "Unpin from Quick Access" : "Pin to Quick Access"}
      >
        {isPinned ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
          </svg>
        )}
      </button>

      <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-surface-soft">
        <span className="text-4xl">📁</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground truncate" title={pawkit.name}>
          {pawkit.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Pawkit</p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground/80">Updated {formatDate(pawkit.updatedAt)}</p>
    </article>
  );
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
