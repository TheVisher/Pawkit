"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, FileText, Plus, ChevronDown } from "lucide-react";
import { PinnedPawkit } from "../hooks/use-home-data";
import { useDataStore } from "@/lib/stores/data-store";
import { CollectionNode } from "@/lib/types";

interface PinnedPawkitsProps {
  pawkits: PinnedPawkit[];
}

// Preview positions - use percentages to spread across card width
const previewPositions = [
  { left: '0%', top: 0, rotate: -6, zIndex: 6 },
  { left: '12%', top: 6, rotate: 3, zIndex: 5 },
  { left: '24%', top: 2, rotate: -3, zIndex: 4 },
  { left: '36%', top: 8, rotate: 5, zIndex: 3 },
  { left: '48%', top: 4, rotate: -2, zIndex: 2 },
  { left: '60%', top: 10, rotate: 4, zIndex: 1 },
];

const MAX_PINNED = 8;

export function PinnedPawkits({ pawkits }: PinnedPawkitsProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { collections, updateCollection } = useDataStore();

  // Flatten collections to get all pawkits
  const flattenCollections = (nodes: CollectionNode[]): CollectionNode[] => {
    return nodes.reduce<CollectionNode[]>((acc, node) => {
      acc.push(node);
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        acc.push(...flattenCollections(node.children));
      }
      return acc;
    }, []);
  };

  // Get unpinned pawkits (exclude system collections and already pinned)
  const pinnedIds = new Set(pawkits.map(p => p.id));
  const unpinnedPawkits = flattenCollections(collections).filter(
    c => !c.isSystem && !pinnedIds.has(c.id)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handlePinPawkit = async (collection: CollectionNode) => {
    await updateCollection(collection.id, { pinned: true });
    setShowDropdown(false);
  };

  if (pawkits.length === 0) {
    return null;
  }

  const hasRoom = pawkits.length < MAX_PINNED;
  const hasUnpinnedOptions = unpinnedPawkits.length > 0;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-visible">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          Manage
        </Link>
      </div>

      {/* 2-column grid of portrait cards - rows stretch to fill height */}
      <div className="flex-1 grid grid-cols-2 grid-rows-4 gap-3 overflow-visible">
        {pawkits.slice(0, MAX_PINNED).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group w-full h-full text-left rounded-xl p-3 transition-all hover:border-accent/30 flex flex-col border-2 border-accent/20 bg-surface/80"
          >
            {/* Header row: icon, name, count */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Folder size={14} className="text-accent" />
                </div>
                <span className="font-medium text-xs text-foreground truncate">{pawkit.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                {pawkit.count}
              </span>
            </div>

            {/* Thumbnail previews - stacked/fanned, grows to fill card */}
            <div className="relative flex-1 min-h-[60px] mt-1">
              {pawkit.previewItems.slice(0, 6).map((item, i) => {
                const pos = previewPositions[i];
                return (
                  <div
                    key={item.id}
                    className="absolute rounded-lg overflow-hidden border border-subtle/50 shadow-md transition-transform group-hover:scale-105"
                    style={{
                      width: '54px',
                      height: '54px',
                      left: pos.left,
                      top: `${pos.top}px`,
                      zIndex: pos.zIndex,
                      transform: `rotate(${pos.rotate}deg)`,
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-soft flex items-center justify-center">
                        <FileText size={12} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* +N more indicator - inline at end of stack */}
              {pawkit.count > pawkit.previewItems.length && (
                <div
                  className="absolute rounded-lg bg-surface-soft/90 border border-subtle/50 flex items-center justify-center text-xs font-medium text-muted-foreground shadow-md"
                  style={{
                    width: '54px',
                    height: '54px',
                    left: `${12 * pawkit.previewItems.length}%`,
                    top: `${(pawkit.previewItems.length % 2) * 6 + 4}px`,
                    zIndex: 0,
                    transform: `rotate(${pawkit.previewItems.length % 2 === 0 ? -3 : 3}deg)`,
                  }}
                >
                  +{pawkit.count - pawkit.previewItems.length}
                </div>
              )}

              {/* Empty state */}
              {pawkit.previewItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-soft/60 text-[10px] text-muted-foreground">
                  Empty
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Placeholder card for adding more pinned pawkits */}
        {hasRoom && hasUnpinnedOptions && (
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full h-full rounded-xl p-3 transition-all flex flex-col items-center justify-center gap-2 border-2 border-dashed border-subtle/50 hover:border-accent/30 hover:bg-accent/5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-soft flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Plus size={16} className="text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors">
                Pin a Pawkit
              </span>
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-subtle bg-surface-soft/95 backdrop-blur-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {unpinnedPawkits.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No pawkits to pin
                  </div>
                ) : (
                  unpinnedPawkits.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => handlePinPawkit(collection)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/10 transition-colors text-left"
                    >
                      <Folder size={14} className="text-accent flex-shrink-0" />
                      <span className="text-xs text-foreground truncate">{collection.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
