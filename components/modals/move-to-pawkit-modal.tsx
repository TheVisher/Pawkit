"use client";

import { useEffect, useState, useMemo } from "react";
import type { CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";
import { GlowButton } from "@/components/ui/glow-button";

export type MoveToPawkitModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (slug: string) => void;
  /** Optional: pass collections directly for faster rendering. Falls back to data store. */
  collections?: CollectionNode[];
};

type FlatPawkit = {
  id: string;
  name: string;
  slug: string;
};

export function MoveToPawkitModal({ open, onClose, onConfirm, collections: propCollections }: MoveToPawkitModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Use prop collections or fall back to data store (instant, local-first)
  const storeCollections = useDataStore((state) => state.collections);
  const collections = propCollections ?? storeCollections;

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedSlug(null);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKey);
    }
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Flatten collections tree with hierarchical names (memoized)
  const pawkits = useMemo(() => {
    const flattenPawkits = (nodes: CollectionNode[], prefix = ""): FlatPawkit[] => {
      const result: FlatPawkit[] = [];
      for (const node of nodes) {
        if (node.deleted) continue; // Skip deleted collections
        const hierarchicalName = prefix ? `${prefix} / ${node.name}` : node.name;
        result.push({
          id: node.id,
          name: hierarchicalName,
          slug: node.slug,
        });
        if (node.children && node.children.length > 0) {
          result.push(...flattenPawkits(node.children, hierarchicalName));
        }
      }
      return result;
    };
    return flattenPawkits(collections);
  }, [collections]);

  if (!open) return null;

  const filteredPawkits = pawkits.filter((pawkit) =>
    pawkit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedSlug) {
      onConfirm(selectedSlug);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-100">Move to Pawkit</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search Pawkits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
            autoFocus
          />
        </div>

        <div className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded border border-gray-800 bg-gray-900/40 p-2">
          {filteredPawkits.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {searchTerm ? "No Pawkits found" : "No Pawkits available"}
            </div>
          ) : (
            filteredPawkits.map((pawkit) => (
              <button
                key={pawkit.id}
                onClick={() => setSelectedSlug(pawkit.slug)}
                className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                  selectedSlug === pawkit.slug
                    ? "bg-accent text-gray-900 font-medium"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {pawkit.name}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <GlowButton
            onClick={onClose}
            variant="primary"
            size="md"
          >
            Cancel
          </GlowButton>
          <GlowButton
            onClick={handleConfirm}
            disabled={!selectedSlug}
            variant="primary"
            size="md"
          >
            Move
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
