"use client";

import { FormEvent, KeyboardEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isProbablyUrl } from "@/lib/utils/strings";
import { AddCardModal } from "@/components/modals/add-card-modal";
import { useSettingsStore } from "@/lib/hooks/settings-store";

const TEXT_SEARCH_DEBOUNCE_MS = 250;

function OmniBarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get("q") ?? "";
  const [value, setValue] = useState(initialQuery);
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);
  const lastSearchedRef = useRef(initialQuery);

  const navigateToLibrary = useCallback(
    (query: string | null) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (!query) {
        params.delete("q");
      } else {
        params.set("q", query);
      }
      const queryString = params.toString();
      router.push(queryString ? `/library?${queryString}` : "/library");
    },
    [router, searchParams]
  );

  useEffect(() => {
    const currentQuery = searchParams?.get("q") ?? "";
    lastSearchedRef.current = currentQuery;
    setValue((prev) => (prev === currentQuery ? prev : currentQuery));
  }, [searchParams]);

  useEffect(() => {
    if (isProbablyUrl(value)) {
      return;
    }

    const trimmed = value.trim();

    const timer = window.setTimeout(() => {
      if (trimmed.length === 0) {
        if (lastSearchedRef.current) {
          navigateToLibrary(null);
          lastSearchedRef.current = "";
        }
        return;
      }

      if (lastSearchedRef.current === trimmed) {
        return;
      }

      navigateToLibrary(trimmed);
      lastSearchedRef.current = trimmed;
    }, TEXT_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, navigateToLibrary]);

  const handleSearch = () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      navigateToLibrary(null);
      lastSearchedRef.current = "";
    } else {
      navigateToLibrary(trimmed);
      lastSearchedRef.current = trimmed;
    }
  };

  const quickAdd = async () => {
    setAdding(true);
    const url = value.trim();

    // Create card immediately
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    setAdding(false);

    if (response.ok) {
      const card = await response.json();
      setValue("");

      // Trigger background metadata fetch (fire and forget)
      fetch(`/api/cards/${card.id}/fetch-metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: card.url, previewServiceUrl })
      }).catch(() => {
        // Silently fail - card is already created
      });

      if (pathname !== "/library") {
        router.push("/library");
      } else {
        router.refresh();
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (isProbablyUrl(value)) {
      event.preventDefault();
      void quickAdd();
      return;
    }
    event.preventDefault();
    handleSearch();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isProbablyUrl(value)) {
      void quickAdd();
    } else {
      handleSearch();
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a URL to save or type to search…"
          className="w-full rounded border border-gray-800 bg-gray-900 py-3 pl-4 pr-14 text-sm text-gray-100"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="mr-3 hidden text-xs text-gray-500 sm:inline">Enter = quick add</span>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-gray-950 transition hover:bg-accent/90"
            aria-label="Open add card form"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </form>
      {adding && <p className="mt-2 text-xs text-gray-500">Saving…</p>}
      <AddCardModal
        open={showModal}
        initialUrl={value}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setValue("");
          if (pathname !== "/library") {
            router.push("/library");
          } else {
            router.refresh();
          }
        }}
      />
    </div>
  );
}

export function OmniBar() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OmniBarContent />
    </Suspense>
  );
}
