"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCollections } from "@/lib/hooks/use-live-data";
import { useCurrentWorkspace } from "@/lib/stores/workspace-store";
import { usePawkitTreeExpanded } from "@/lib/stores/ui-store";
import { PawkitTreeItem } from "./pawkit-tree-item";
import type { LocalCollection } from "@/lib/db";
import { CreatePawkitButton } from "./create-pawkit-button";
import { Separator } from "@/components/ui/separator";

export function PawkitsTree() {
  const workspace = useCurrentWorkspace();
  const collections = useCollections(workspace?.id);
  const { expandedIds, toggle } = usePawkitTreeExpanded();

  // Build tree structure - split regular and system Pawkits
  const { rootCollections, systemCollections } = useMemo(() => {
    const regular = collections
      .filter((c) => !c.parentId && !c._deleted && !c.isSystem)
      .sort((a, b) => a.position - b.position);

    const system = collections
      .filter((c) => c.isSystem && !c._deleted)
      .sort((a, b) => a.position - b.position);

    return { rootCollections: regular, systemCollections: system };
  }, [collections]);

  const getChildCollections = (parentId: string) => {
    return collections
      .filter((c) => c.parentId === parentId && !c._deleted)
      .sort((a, b) => a.position - b.position);
  };

  const renderItem = (collection: LocalCollection, level: number = 0) => {
    const children = getChildCollections(collection.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.includes(collection.id);

    return (
      <div key={collection.id}>
        <PawkitTreeItem
          collection={collection}
          childCollections={children} // Pass empty if not expanded? No, item needs to know if children exist
          allCollections={collections}
          level={level}
          isExpanded={isExpanded}
          onToggleExpand={toggle}
          // We handle recursion here manually to pass props correctly
        />
        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-0.5">
                {children.map((child) => renderItem(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0.5 pl-4">
      {rootCollections.map((c) => renderItem(c))}

      {/* System Pawkits Section */}
      {systemCollections.length > 0 && (
        <>
          <Separator className="my-2 opacity-50" />
          {systemCollections.map((c) => (
            <PawkitTreeItem
              key={c.id}
              collection={c}
              allCollections={collections}
              level={0}
            />
          ))}
        </>
      )}

      <div className="mt-1 text-xs text-text-muted hover:text-text-primary px-2 transition-colors cursor-pointer">
        <CreatePawkitButton />
      </div>
    </div>
  );
}
