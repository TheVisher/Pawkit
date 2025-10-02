"use client";

import { FormEvent, KeyboardEvent, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isProbablyUrl } from "@/lib/utils/strings";
import { AddCardModal } from "@/components/modals/add-card-modal";
import { useSettingsStore } from "@/lib/hooks/settings-store";

function OmniBarContent() {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const autoFetchMetadata = useSettingsStore((state) => state.autoFetchMetadata);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value.trim().length === 0) {
      params.delete("q");
    } else {
      params.set("q", value.trim());
    }
    router.push(`/library?${params.toString()}`);
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
    if (event.shiftKey) {
      if (isProbablyUrl(value)) {
        setShowModal(true);
      }
      return;
    }
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
          className="w-full rounded border border-gray-800 bg-gray-900 py-3 pl-4 pr-32 text-sm text-gray-100"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3 text-xs text-gray-500">
          <span className="rounded bg-gray-800 px-2 py-1">Enter = quick add</span>
          <span className="rounded bg-gray-800 px-2 py-1">Shift+Enter = open form</span>
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
