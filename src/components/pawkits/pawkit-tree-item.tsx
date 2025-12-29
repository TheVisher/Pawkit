"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { PawkitContextMenu } from "@/components/context-menus";
import type { LocalCollection } from "@/lib/db";

interface PawkitTreeItemProps {
  collection: LocalCollection;
  childCollections?: LocalCollection[];
  level?: number;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  cardCount?: number;
}

export function PawkitTreeItem({
  collection,
  childCollections = [],
  level = 0,
  isExpanded = false,
  onToggleExpand,
  cardCount = 0,
}: PawkitTreeItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/pawkits/${collection.slug}`;
  const hasChildren = childCollections.length > 0;

  // DnD Drop Target
  const { setNodeRef, isOver } = useDroppable({
    id: `collection-${collection.slug}`,
    data: {
      type: "collection",
      slug: collection.slug,
      name: collection.name,
    },
  });

  return (
    <PawkitContextMenu collection={collection}>
      <div className="select-none relative">
        <div
          ref={setNodeRef}
          className={cn(
            "group flex items-center justify-between py-2 px-2 rounded-xl transition-colors duration-200 cursor-pointer text-sm border border-transparent relative",
            isActive
              ? "text-text-primary font-medium"
              : "text-text-secondary hover:text-text-primary",
            isOver &&
              "bg-[var(--color-accent)]/20 ring-2 ring-inset ring-[var(--color-accent)]",
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isActive && (
            <motion.div
              layoutId="active-sidebar-item"
              className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
              initial={false}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
            />
          )}
          {/* Link to Pawkit Page */}
          <Link
            href={`/pawkits/${collection.slug}`}
            className="flex items-center flex-1 min-w-0 z-10 relative"
          >
            <span className="relative flex items-center gap-2 min-w-0">
              {isActive ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 group-hover:text-[var(--color-accent)]/80 transition-colors" />
              )}
              <span className="truncate">{collection.name}</span>
              {/* Hover Glow Line (Content Width + Extension) */}
              {!isActive && (
                <div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
              )}
            </span>
          </Link>

          {/* Right side: Card count and Expand/Collapse */}
          <div className="flex items-center gap-1 shrink-0 z-10 relative">
            {cardCount > 0 && (
              <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                {cardCount}
              </span>
            )}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleExpand?.(collection.id);
                }}
                className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </PawkitContextMenu>
  );
}
