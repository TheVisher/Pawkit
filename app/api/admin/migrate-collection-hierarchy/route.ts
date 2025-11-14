import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CollectionNode } from "@/lib/types";

/**
 * Migration endpoint to fix cards that are missing parent collection tags.
 *
 * When a card is in a sub-pawkit (e.g., "Restaurants > Everett"), it should have
 * both ["everett", "restaurants"] in its collections array. This migration fixes
 * cards that only have the child collection.
 *
 * This is a one-time migration but can be run multiple times safely.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all collections for this user
    const { data: collections, error: collectionsError } = await supabase
      .from("collections")
      .select("*")
      .eq("userId", user.id)
      .eq("deleted", false);

    if (collectionsError) {
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 }
      );
    }

    // Build collection hierarchy map
    const collectionMap = new Map<string, any>();
    for (const collection of collections) {
      collectionMap.set(collection.slug, collection);
    }

    // Helper to get all parent slugs for a collection
    const getParentSlugs = (slug: string): string[] => {
      const parents: string[] = [];
      const collection = collectionMap.get(slug);

      if (collection && collection.parentId) {
        // Find parent by ID
        const parent = collections.find((c: any) => c.id === collection.parentId);
        if (parent) {
          parents.push(parent.slug);
          // Recursively get parent's parents
          parents.push(...getParentSlugs(parent.slug));
        }
      }

      return parents;
    };

    // Get all cards for this user
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, collections")
      .eq("userId", user.id)
      .eq("deleted", false);

    if (cardsError) {
      return NextResponse.json(
        { error: "Failed to fetch cards" },
        { status: 500 }
      );
    }

    let updatedCount = 0;
    const updates: Array<{ id: string; collections: string[] }> = [];

    // Process each card
    for (const card of cards) {
      const currentCollections = card.collections
        ? JSON.parse(card.collections as any)
        : [];

      if (!Array.isArray(currentCollections) || currentCollections.length === 0) {
        continue;
      }

      // Collect all required slugs (current + parents)
      const allRequiredSlugs = new Set<string>();

      for (const slug of currentCollections) {
        allRequiredSlugs.add(slug);
        const parents = getParentSlugs(slug);
        parents.forEach(p => allRequiredSlugs.add(p));
      }

      const newCollections = Array.from(allRequiredSlugs);

      // Check if we need to update
      if (newCollections.length !== currentCollections.length ||
          !newCollections.every(s => currentCollections.includes(s))) {
        updates.push({
          id: card.id,
          collections: newCollections
        });
        updatedCount++;
      }
    }

    // Perform batch update
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("cards")
          .update({ collections: JSON.stringify(update.collections) })
          .eq("id", update.id);

        if (updateError) {
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Updated ${updatedCount} cards.`,
      stats: {
        totalCards: cards.length,
        updatedCards: updatedCount,
        totalCollections: collections.length
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
