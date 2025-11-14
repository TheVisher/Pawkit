import type { CollectionNode } from "@/lib/types";

/**
 * Gets the complete hierarchy of collection slugs for a given collection,
 * walking up the parent chain to include all ancestor collections.
 *
 * @param targetSlug - The slug of the collection to get hierarchy for
 * @param collections - The flat or hierarchical array of all collections
 * @returns Array of slugs including the target and all parents, ordered from child to root
 *
 * @example
 * // Collection structure: Restaurants > Seattle > Downtown
 * getCollectionHierarchy("downtown", collections)
 * // Returns: ["downtown", "seattle", "restaurants"]
 */
export function getCollectionHierarchy(
  targetSlug: string,
  collections: CollectionNode[]
): string[] {
  // Build a map of slug -> collection for fast lookup
  const collectionMap = new Map<string, CollectionNode>();

  const flattenCollections = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      collectionMap.set(node.slug, node);
      if (node.children && node.children.length > 0) {
        flattenCollections(node.children);
      }
    }
  };

  flattenCollections(collections);

  // Walk up the hierarchy
  const hierarchy: string[] = [];
  let current = collectionMap.get(targetSlug);

  while (current) {
    hierarchy.push(current.slug);

    // Move to parent if it exists
    if (current.parentId) {
      // Find parent by ID
      current = Array.from(collectionMap.values()).find(c => c.id === current!.parentId);
      if (!current) break;
    } else {
      break;
    }
  }

  return hierarchy;
}

/**
 * Adds a collection and all its parent collections to a card's collection array.
 * Ensures no duplicates and maintains existing collections.
 *
 * @param currentCollections - Current collection slugs on the card
 * @param newCollectionSlug - The new collection slug to add
 * @param allCollections - All available collections for hierarchy lookup
 * @returns Updated collection slugs array with hierarchy
 */
export function addCollectionWithHierarchy(
  currentCollections: string[],
  newCollectionSlug: string,
  allCollections: CollectionNode[]
): string[] {
  const hierarchy = getCollectionHierarchy(newCollectionSlug, allCollections);
  const combined = [...currentCollections, ...hierarchy];
  return Array.from(new Set(combined));
}

/**
 * Removes a collection and optionally its child collections from a card.
 * When removing a parent, can choose to keep or remove orphaned children.
 *
 * @param currentCollections - Current collection slugs on the card
 * @param collectionToRemove - The collection slug to remove
 * @param allCollections - All available collections for hierarchy lookup
 * @param removeChildrenToo - If true, removes all children of the collection as well
 * @returns Updated collection slugs array
 */
export function removeCollectionWithHierarchy(
  currentCollections: string[],
  collectionToRemove: string,
  allCollections: CollectionNode[],
  removeChildrenToo: boolean = false
): string[] {
  const collectionMap = new Map<string, CollectionNode>();

  const flattenCollections = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      collectionMap.set(node.slug, node);
      if (node.children && node.children.length > 0) {
        flattenCollections(node.children);
      }
    }
  };

  flattenCollections(allCollections);

  let toRemove = new Set([collectionToRemove]);

  // If removing children too, find all descendant slugs
  if (removeChildrenToo) {
    const collectDescendants = (slug: string) => {
      const collection = collectionMap.get(slug);
      if (collection && collection.children) {
        for (const child of collection.children) {
          toRemove.add(child.slug);
          collectDescendants(child.slug);
        }
      }
    };
    collectDescendants(collectionToRemove);
  }

  // Remove the collection(s)
  return currentCollections.filter(slug => !toRemove.has(slug));
}

/**
 * Checks if a card should be visible in a collection view, considering hierarchy.
 * A card is visible if it has the collection slug OR any of its descendants.
 *
 * @param cardCollections - Collection slugs on the card
 * @param viewCollectionSlug - The collection being viewed
 * @param allCollections - All available collections
 * @returns True if card should be visible in this collection view
 */
export function isCardInCollectionHierarchy(
  cardCollections: string[],
  viewCollectionSlug: string,
  allCollections: CollectionNode[]
): boolean {
  // Direct match
  if (cardCollections.includes(viewCollectionSlug)) {
    return true;
  }

  // Check if card is in any descendant collection
  const collectionMap = new Map<string, CollectionNode>();

  const flattenCollections = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      collectionMap.set(node.slug, node);
      if (node.children && node.children.length > 0) {
        flattenCollections(node.children);
      }
    }
  };

  flattenCollections(allCollections);

  const getDescendantSlugs = (slug: string): Set<string> => {
    const descendants = new Set<string>();
    const collection = collectionMap.get(slug);

    if (collection && collection.children) {
      for (const child of collection.children) {
        descendants.add(child.slug);
        const childDescendants = getDescendantSlugs(child.slug);
        childDescendants.forEach(d => descendants.add(d));
      }
    }

    return descendants;
  };

  const descendants = getDescendantSlugs(viewCollectionSlug);
  return cardCollections.some(slug => descendants.has(slug));
}
