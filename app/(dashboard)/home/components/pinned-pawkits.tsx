"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, FileText, Plus } from "lucide-react";
import { PinnedPawkit } from "../hooks/use-home-data";
import { useDataStore } from "@/lib/stores/data-store";
import { CollectionNode } from "@/lib/types";

interface PinnedPawkitsProps {
  pawkits: PinnedPawkit[];
}

// Preview positions for stacked thumbnails - spread out more
const previewPositions = [
  { left: 0, top: 8, rotate: -6, zIndex: 4 },
  { left: 40, top: 0, rotate: 3, zIndex: 3 },
  { left: 80, top: 10, rotate: -3, zIndex: 2 },
  { left: 120, top: 4, rotate: 5, zIndex: 1 },
];

const MAX_VISIBLE = 4;

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

  const hasUnpinnedOptions = unpinnedPawkits.length > 0;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Horizontal row of pawkit cards - stretch to fill with min/max constraints */}
      {/* p-1 -m-1 gives room for shadows without clipping */}
      <div className="flex gap-3 p-1 -m-1">
        {pawkits.slice(0, MAX_VISIBLE).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group flex-1 min-w-[200px] max-w-[320px] text-left rounded-xl p-4 transition-all hover:border-accent/30 flex flex-col border border-subtle bg-surface/80"
          >
            {/* Header: icon + name */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Folder size={14} className="text-accent" />
              </div>
              <span className="font-medium text-sm text-foreground truncate flex-1">{pawkit.name}</span>
              <span className="text-xs text-muted-foreground">{pawkit.count}</span>
            </div>

            {/* Stacked thumbnail previews - spread out */}
            <div className="relative h-[70px]">
              {pawkit.previewItems.slice(0, 4).map((item, i) => {
                const pos = previewPositions[i];
                return (
                  <div
                    key={item.id}
                    className="absolute rounded-lg overflow-hidden border border-subtle/50 shadow-sm transition-transform group-hover:scale-105"
                    style={{
                      width: '50px',
                      height: '50px',
                      left: `${pos.left}px`,
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

              {/* Empty state */}
              {pawkit.previewItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-soft/60 text-xs text-muted-foreground">
                  Empty
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Ghost placeholder cards for remaining slots */}
        {Array.from({ length: MAX_VISIBLE - pawkits.length }).map((_, index) => (
          <div key={`ghost-${index}`} className="relative flex-1 min-w-[200px] max-w-[320px]">
            {/* First ghost slot has the dropdown, others are just placeholders */}
            {index === 0 && hasUnpinnedOptions ? (
              <>
                <button
                  ref={buttonRef}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full h-full rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-3 border border-dashed border-subtle/50 hover:border-accent/30 hover:bg-accent/5 group"
                >
                  <div className="w-8 h-8 rounded-md bg-surface-soft flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Plus size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors">
                    Pin Pawkit
                  </span>
                </button>

                {/* Dropdown */}
                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div
                      ref={dropdownRef}
                      className="absolute bottom-full left-0 mb-2 z-50 w-48 max-h-48 overflow-y-auto scrollbar-minimal p-1.5"
                      style={{
                        background: 'var(--bg-surface-1)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-3)',
                        border: '1px solid var(--border-subtle)',
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      {unpinnedPawkits.map((collection) => (
                        <button
                          key={collection.id}
                          onClick={() => handlePinPawkit(collection)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent/10 transition-colors text-left rounded-md"
                        >
                          <Folder size={12} className="text-accent flex-shrink-0" />
                          <span className="text-xs text-foreground truncate">{collection.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-dashed border-subtle/30 opacity-40">
                <div className="w-8 h-8 rounded-md bg-surface-soft/50 flex items-center justify-center">
                  <Folder size={18} className="text-muted-foreground/50" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
