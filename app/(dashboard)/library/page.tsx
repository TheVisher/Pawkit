"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, Suspense, useEffect, useState } from "react";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryView } from "@/components/library/library-view";
import { useDataStore } from "@/lib/stores/data-store";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { AnimatedBackground } from "@/components/rediscover/animated-background";
import { RediscoverMode, RediscoverAction } from "@/components/rediscover/rediscover-mode";
import { useRediscoverStore, RediscoverFilter } from "@/lib/hooks/rediscover-store";
import { CardModel } from "@/lib/types";

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const updateViewSettings = useViewSettingsStore((state) => state.updateSettings);
  const viewSettings = useViewSettingsStore((state) => state.getSettings("library"));
  const setContentType = usePanelStore((state) => state.setContentType);

  const q = searchParams.get("q") || undefined;
  const collection = searchParams.get("collection") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const statusParam = searchParams.get("status") || undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;
  const viewParam = searchParams.get("view") || "normal";
  const daysParam = searchParams.get("days") || "30";
  const mode = searchParams.get("mode") || "normal";

  // Rediscover mode state from store
  const rediscoverStore = useRediscoverStore();
  const isRediscoverMode = mode === "rediscover";

  // Read from localStorage first, then URL param, then default
  const savedLayout = typeof window !== 'undefined' ? localStorage.getItem("library-layout") as LayoutMode | null : null;
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : savedLayout && LAYOUTS.includes(savedLayout)
      ? savedLayout
      : DEFAULT_LAYOUT;

  // Parse view mode and days
  const viewMode = viewParam === "timeline" ? "timeline" : "normal";
  const validDays = [7, 30, 90, 180, 365];
  const requestedDays = parseInt(daysParam, 10);
  const days = validDays.includes(requestedDays) ? requestedDays : 30;

  // Read from global store - instant, no API calls
  const { cards, collections } = useDataStore();

  // DEBUG: Log deleted cards in store
  useEffect(() => {
    const deletedCount = cards.filter(c => c.deleted).length;
    if (deletedCount > 0) {
      console.error('[Library] ⚠️ DELETED CARDS IN STORE:', deletedCount);
      console.error('[Library] Deleted cards:', cards.filter(c => c.deleted).map(c => ({
        id: c.id,
        title: c.title,
        deleted: c.deleted,
        deletedAt: c.deletedAt
      })));
    } else {
    }
  }, [cards]);

  // Get content type filter from view settings
  const contentTypeFilter = viewSettings.contentTypeFilter;

  // Set the right panel content to show library controls
  useEffect(() => {
    setContentType("library-controls");
  }, [setContentType]);

  // Check if tag filter exists in any card, if not clear it
  useEffect(() => {
    if (tag) {
      const tagExists = cards.some(card => card.tags?.includes(tag));
      if (!tagExists) {
        // Tag doesn't exist in any card, clear the filter from URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete('tag');
        router.replace(`/library?${params.toString()}`);
      }
    }

    // Also check view settings for selectedTags (only if viewSettings is loaded)
    if (viewSettings && viewSettings.viewSpecific) {
      const selectedTags = (viewSettings.viewSpecific.selectedTags as string[]) || [];
      if (selectedTags.length > 0) {
        const validTags = selectedTags.filter(tagName =>
          cards.some(card => card.tags?.includes(tagName) || card.collections?.includes(tagName))
        );
        // If any tags were filtered out, update view settings
        if (validTags.length !== selectedTags.length) {
          updateViewSettings("library", {
            viewSpecific: {
              ...viewSettings.viewSpecific,
              selectedTags: validTags
            }
          });
        }
      }
    }
  }, [tag, cards, searchParams, router, viewSettings, updateViewSettings]);

  // Filter cards based on search params (client-side filtering)
  const items = useMemo((): CardModel[] => {
    // Build a set of private collection SLUGS for fast lookup (cards store slugs, not IDs)
    const privateCollectionSlugs = new Set<string>();
    const getAllPrivateSlugs = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node.isPrivate) {
          privateCollectionSlugs.add(node.slug);
        }
        if (node.children && node.children.length > 0) {
          getAllPrivateSlugs(node.children);
        }
      }
    };
    getAllPrivateSlugs(collections);

    let filtered = cards;

    // Exclude deleted cards, cards in The Den, or in private collections
    filtered = filtered.filter(card => {
      if (card.deleted === true) return false;
      if (card.collections?.includes('the-den')) return false;
      const isInPrivateCollection = card.collections?.some(collectionSlug =>
        privateCollectionSlugs.has(collectionSlug)
      );
      return !isInPrivateCollection;
    });

    // Search query
    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(card =>
        card.title?.toLowerCase().includes(query) ||
        card.url?.toLowerCase().includes(query) ||
        card.notes?.toLowerCase().includes(query)
      );
    }

    // Collection filter
    if (collection) {
      filtered = filtered.filter(card =>
        card.collections?.includes(collection)
      );
    }

    // Tag filter - only apply if tag actually exists in some card
    if (tag) {
      const tagExists = cards.some(card => card.tags?.includes(tag));
      if (tagExists) {
        filtered = filtered.filter(card =>
          card.tags?.includes(tag)
        );
      }
    }

    // Status filter
    if (status) {
      filtered = filtered.filter(card => card.status === status);
    }

    // Content type filter - if array is not empty, filter by selected types
    if (contentTypeFilter && contentTypeFilter.length > 0) {
      filtered = filtered.filter(card => {
        // Check if card type matches any of the selected content types
        return contentTypeFilter.some(filterType => {
          // For "url" content type, we need to check if it's a bookmark (url type but not a note)
          if (filterType === "url") {
            return card.type === "url";
          }
          // For "md-note", match md-note or text-note types
          if (filterType === "md-note") {
            return card.type === "md-note" || card.type === "text-note";
          }
          // For other types, match the card type directly
          return card.type === filterType;
        });
      });
    }

    return filtered;
  }, [cards, collections, q, collection, tag, status, contentTypeFilter]);

  // Debug: Log content type filter and card types (after items is computed)
  useEffect(() => {

    // Log card type distribution
    const typeCount: Record<string, number> = {};
    items.forEach(card => {
      typeCount[card.type] = (typeCount[card.type] || 0) + 1;
    });

    // Check if we're showing notes when we shouldn't
    const noteCount = items.filter(c => c.type === 'md-note' || c.type === 'text-note').length;
    if (noteCount > 0 && contentTypeFilter.length === 0) {
    }
  }, [contentTypeFilter, cards.length, items]);

  // Apply filter to get filtered cards
  const getFilteredCards = (filterType: RediscoverFilter) => {
    // Start with bookmarks only (exclude notes)
    let filtered = items.filter(card => card.type === "url");

    switch (filterType) {
      case "uncategorized":
        // No tags and no collections
        filtered = filtered.filter(card =>
          (!card.tags || card.tags.length === 0) &&
          (!card.collections || card.collections.length === 0)
        );
        break;
      case "all":
        // All bookmarks (already filtered above)
        break;
      case "untagged":
        // No tags (but may have collections)
        filtered = filtered.filter(card => !card.tags || card.tags.length === 0);
        break;
      case "never-opened":
        // TODO: Add lastOpenedAt field to track this
        // For now, treat as uncategorized
        filtered = filtered.filter(card =>
          (!card.tags || card.tags.length === 0) &&
          (!card.collections || card.collections.length === 0)
        );
        break;
    }

    return filtered;
  };

  // Initialize Rediscover queue when entering Rediscover mode or filter changes
  useEffect(() => {
    if (isRediscoverMode) {
      const filtered = getFilteredCards(rediscoverStore.filter);
      rediscoverStore.setQueue(filtered);
      rediscoverStore.setCurrentIndex(0);
      rediscoverStore.setActive(true);

      // Only reset stats on initial entry
      if (rediscoverStore.queue.length === 0) {
        rediscoverStore.reset();
        rediscoverStore.setActive(true);
        rediscoverStore.setQueue(filtered);
      }
    } else {
      // Exit Rediscover mode
      if (rediscoverStore.isActive) {
        rediscoverStore.reset();
      }
    }
  }, [isRediscoverMode, rediscoverStore.filter, items]);

  // Handlers for Rediscover mode
  const handleRediscoverAction = async (action: RediscoverAction, cardId: string) => {
    const card = rediscoverStore.queue[rediscoverStore.currentIndex];
    if (!card || card.id !== cardId) return;

    // Update session stats - map action to stat key
    const statKey = action === "keep" ? "kept" : "deleted";
    rediscoverStore.updateStats(statKey);

    // Handle action
    if (action === "keep") {
      rediscoverStore.addKeptCard(card);
    } else if (action === "delete") {
      // Delete the card
      await useDataStore.getState().deleteCard(cardId);
    }

    // Move to next card
    rediscoverStore.setCurrentIndex(rediscoverStore.currentIndex + 1);
  };

  const handleExitRediscover = () => {
    // Remove mode=rediscover from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mode");
    router.push(`/library?${params.toString()}`);

    // Reset will happen in useEffect when mode changes
  };

  // Get current card for Rediscover mode
  const currentCard = rediscoverStore.currentIndex < rediscoverStore.queue.length
    ? rediscoverStore.queue[rediscoverStore.currentIndex]
    : null;
  const remainingCount = rediscoverStore.queue.length - rediscoverStore.currentIndex;

  // Render Rediscover mode or normal Library view
  if (isRediscoverMode) {
    return (
      <>
        <AnimatedBackground />
        <RediscoverMode
          currentCard={currentCard}
          onAction={handleRediscoverAction}
          onExit={handleExitRediscover}
          remainingCount={remainingCount}
        />
      </>
    );
  }

  return (
    <LibraryView
      initialCards={items}
      initialNextCursor={undefined}
      collectionsTree={collections}
      query={{ q, collection, tag, status }}
      viewMode={viewMode}
      timelineDays={days}
    />
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LibraryPageContent />
    </Suspense>
  );
}
