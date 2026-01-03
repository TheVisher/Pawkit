/**
 * Tag Architecture Migration
 *
 * This migration merges the `collections` field into `tags` and adds
 * ancestor tags for cards in nested Pawkits.
 *
 * IMPORTANT: This is a one-way migration. After running, cards will no longer
 * have a `collections` field - all organization is done via `tags`.
 *
 * See: .claude/skills/pawkit-tag-architecture/SKILL.md
 */

import { db } from '@/lib/db/schema';
import type { LocalCard, LocalCollection } from '@/lib/db/types';

// =============================================================================
// MIGRATION STATUS
// =============================================================================

const MIGRATION_KEY = 'tag-architecture-migration-v1';
const NORMALIZATION_KEY = 'tag-normalization-v1';

export async function hasMigrationRun(): Promise<boolean> {
  const entry = await db.metadata.get(MIGRATION_KEY);
  return entry?.value === true;
}

async function markMigrationComplete(): Promise<void> {
  await db.metadata.put({ key: MIGRATION_KEY, value: true });
}

async function hasNormalizationRun(): Promise<boolean> {
  const entry = await db.metadata.get(NORMALIZATION_KEY);
  return entry?.value === true;
}

async function markNormalizationComplete(): Promise<void> {
  await db.metadata.put({ key: NORMALIZATION_KEY, value: true });
}

// =============================================================================
// TAG NORMALIZATION (lowercase all tags)
// =============================================================================

/**
 * Normalize all tags to lowercase
 * This is a one-time migration to ensure consistent tag matching
 */
export async function normalizeAllTags(
  workspaceId?: string
): Promise<{ cardsUpdated: number }> {
  // Check if already run
  if (await hasNormalizationRun()) {
    console.log('Tag normalization already completed. Skipping.');
    return { cardsUpdated: 0 };
  }

  let cardsUpdated = 0;

  const cards = workspaceId
    ? await db.cards.where('workspaceId').equals(workspaceId).toArray()
    : await db.cards.toArray();

  await db.transaction('rw', db.cards, async () => {
    for (const card of cards) {
      const tags = card.tags || [];
      const normalizedTags = tags.map((t) => t.toLowerCase());

      // Check if any tag changed
      const changed = tags.some((t, i) => t !== normalizedTags[i]);

      if (changed) {
        // Dedupe after normalization (in case "Football" and "football" both existed)
        const dedupedTags = [...new Set(normalizedTags)];

        await db.cards.update(card.id, {
          tags: dedupedTags,
          _synced: false,
          _lastModified: new Date(),
        });
        cardsUpdated++;
      }
    }
  });

  await markNormalizationComplete();
  console.log(`Tag normalization complete: ${cardsUpdated} cards updated`);

  return { cardsUpdated };
}

// =============================================================================
// PAWKIT ANCESTRY HELPERS
// =============================================================================

/**
 * Build a map of collection ID -> slug for quick lookups
 */
async function buildCollectionSlugMap(
  workspaceId: string
): Promise<Map<string, string>> {
  const collections = await db.collections
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();

  return new Map(collections.map((c) => [c.id, c.slug]));
}

/**
 * Build a map of collection ID -> parent ID for ancestry traversal
 */
async function buildParentMap(
  workspaceId: string
): Promise<Map<string, string | undefined>> {
  const collections = await db.collections
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();

  return new Map(collections.map((c) => [c.id, c.parentId]));
}

/**
 * Build a map of slug -> collection ID
 */
async function buildSlugToIdMap(
  workspaceId: string
): Promise<Map<string, string>> {
  const collections = await db.collections
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();

  return new Map(collections.map((c) => [c.slug, c.id]));
}

/**
 * Get all ancestor slugs for a collection (from root to the collection itself)
 * Returns: ['grandparent-slug', 'parent-slug', 'this-slug']
 */
function getAncestryPath(
  collectionId: string,
  idToSlug: Map<string, string>,
  idToParent: Map<string, string | undefined>,
  visited = new Set<string>()
): string[] {
  // Prevent infinite loops from circular references
  if (visited.has(collectionId)) {
    console.warn(`Circular reference detected for collection ${collectionId}`);
    return [];
  }
  visited.add(collectionId);

  const slug = idToSlug.get(collectionId);
  if (!slug) return [];

  const parentId = idToParent.get(collectionId);
  if (!parentId) {
    // This is a root collection
    return [slug];
  }

  // Recursively get parent ancestry, then append this slug
  const parentPath = getAncestryPath(parentId, idToSlug, idToParent, visited);
  return [...parentPath, slug];
}

/**
 * Given a collection slug, get full ancestry path
 */
async function getAncestryForSlug(
  slug: string,
  slugToId: Map<string, string>,
  idToSlug: Map<string, string>,
  idToParent: Map<string, string | undefined>
): Promise<string[]> {
  const collectionId = slugToId.get(slug);
  if (!collectionId) {
    // Slug doesn't match any collection, just return it as-is
    return [slug];
  }

  return getAncestryPath(collectionId, idToSlug, idToParent);
}

// =============================================================================
// MAIN MIGRATION
// =============================================================================

export interface MigrationResult {
  success: boolean;
  cardsProcessed: number;
  cardsUpdated: number;
  errors: string[];
  dryRun: boolean;
}

/**
 * Run the tag architecture migration
 *
 * @param dryRun - If true, don't actually update cards (just report what would change)
 * @param workspaceId - Optional: only migrate cards in this workspace
 */
export async function runTagArchitectureMigration(
  dryRun = false,
  workspaceId?: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    cardsProcessed: 0,
    cardsUpdated: 0,
    errors: [],
    dryRun,
  };

  try {
    // Check if migration already ran
    if (!dryRun && (await hasMigrationRun())) {
      console.log('Tag architecture migration already completed. Skipping.');
      result.success = true;
      return result;
    }

    // Get all workspaces (or just the specified one)
    const workspaces = workspaceId
      ? await db.workspaces.where('id').equals(workspaceId).toArray()
      : await db.workspaces.toArray();

    for (const workspace of workspaces) {
      console.log(`Processing workspace: ${workspace.name} (${workspace.id})`);

      // Build lookup maps for this workspace
      const idToSlug = await buildCollectionSlugMap(workspace.id);
      const idToParent = await buildParentMap(workspace.id);
      const slugToId = await buildSlugToIdMap(workspace.id);

      // Get all cards in this workspace
      const cards = await db.cards
        .where('workspaceId')
        .equals(workspace.id)
        .toArray();

      for (const card of cards) {
        result.cardsProcessed++;

        // Skip if no collections to migrate
        if (!card.collections || card.collections.length === 0) {
          continue;
        }

        // Build the new tags array
        const existingTags = card.tags || [];
        const newTagsFromCollections: string[] = [];

        // For each collection slug, get full ancestry and add all ancestor tags
        for (const collectionSlug of card.collections) {
          const ancestry = await getAncestryForSlug(
            collectionSlug,
            slugToId,
            idToSlug,
            idToParent
          );
          newTagsFromCollections.push(...ancestry);
        }

        // Merge, dedupe, and normalize to lowercase
        const mergedTags = [
          ...new Set(
            [...existingTags, ...newTagsFromCollections].map((t) => t.toLowerCase())
          ),
        ];

        // Check if anything changed
        const tagsChanged =
          mergedTags.length !== existingTags.length ||
          mergedTags.some((t) => !existingTags.includes(t));

        if (tagsChanged) {
          result.cardsUpdated++;

          if (dryRun) {
            console.log(`[DRY RUN] Would update card ${card.id}:`);
            console.log(`  collections: [${card.collections.join(', ')}]`);
            console.log(`  old tags: [${existingTags.join(', ')}]`);
            console.log(`  new tags: [${mergedTags.join(', ')}]`);
          } else {
            // Update the card
            await db.cards.update(card.id, {
              tags: mergedTags,
              // Note: We don't remove `collections` here because Dexie
              // doesn't support field removal in updates. The field will
              // be ignored going forward and can be cleaned up later.
              _synced: false,
              _lastModified: new Date(),
            });
          }
        }
      }
    }

    // Mark migration complete
    if (!dryRun) {
      await markMigrationComplete();
    }

    result.success = true;
    console.log(
      `Migration ${dryRun ? '(DRY RUN) ' : ''}complete: ${result.cardsUpdated}/${result.cardsProcessed} cards updated`
    );
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.error('Migration failed:', error);
  }

  return result;
}

// =============================================================================
// UTILITY: Add card to Pawkit (with ancestor tags)
// =============================================================================

/**
 * Add a card to a Pawkit, including all ancestor tags.
 * This is the NEW way to add cards to Pawkits.
 *
 * @param cardId - The card to update
 * @param pawkitSlug - The Pawkit slug to add
 * @param workspaceId - The workspace ID
 */
export async function addCardToPawkit(
  cardId: string,
  pawkitSlug: string,
  workspaceId: string
): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);

  // Build lookup maps
  const idToSlug = await buildCollectionSlugMap(workspaceId);
  const idToParent = await buildParentMap(workspaceId);
  const slugToId = await buildSlugToIdMap(workspaceId);

  // Get full ancestry for this Pawkit
  const ancestry = await getAncestryForSlug(
    pawkitSlug,
    slugToId,
    idToSlug,
    idToParent
  );

  // Get existing non-Pawkit tags (normalized to lowercase)
  const allPawkitSlugs = new Set(idToSlug.values());
  const nonPawkitTags = (card.tags || [])
    .map((t) => t.toLowerCase())
    .filter((t) => !allPawkitSlugs.has(t));

  // Merge: non-Pawkit tags + new ancestry (all lowercase)
  const newTags = [...new Set([...nonPawkitTags, ...ancestry.map((t) => t.toLowerCase())])];

  // Check if we're adding a supertag that has a template
  // Import dynamically to avoid circular dependencies
  const { checkSupertagAddition, applyTemplate } = await import('@/lib/utils/template-applicator');
  const oldTags = card.tags || [];
  const result = checkSupertagAddition(oldTags, newTags, card.content);

  const updates: Record<string, unknown> = {
    tags: newTags,
    _synced: false,
    _lastModified: new Date(),
  };

  // Auto-apply template if card is empty and a supertag with template was added
  if (result.shouldApply && result.template) {
    updates.content = applyTemplate(card.content, result.template);
  }

  await db.cards.update(cardId, updates);
}

/**
 * Remove a card from a Pawkit (removes all ancestor tags for that Pawkit branch)
 */
export async function removeCardFromPawkit(
  cardId: string,
  pawkitSlug: string,
  workspaceId: string
): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);

  // Build lookup maps
  const idToSlug = await buildCollectionSlugMap(workspaceId);
  const idToParent = await buildParentMap(workspaceId);
  const slugToId = await buildSlugToIdMap(workspaceId);

  // Get full ancestry for this Pawkit (all tags to remove)
  const ancestryToRemove = new Set(
    await getAncestryForSlug(pawkitSlug, slugToId, idToSlug, idToParent)
  );

  // Remove those tags
  const newTags = (card.tags || []).filter((t) => !ancestryToRemove.has(t));

  await db.cards.update(cardId, {
    tags: newTags,
    _synced: false,
    _lastModified: new Date(),
  });
}

/**
 * Move a card from one Pawkit to another
 */
export async function moveCardToPawkit(
  cardId: string,
  fromPawkitSlug: string,
  toPawkitSlug: string,
  workspaceId: string
): Promise<void> {
  await removeCardFromPawkit(cardId, fromPawkitSlug, workspaceId);
  await addCardToPawkit(cardId, toPawkitSlug, workspaceId);
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get all descendant Pawkit slugs for a given Pawkit
 */
export async function getDescendantSlugs(
  pawkitSlug: string,
  workspaceId: string
): Promise<string[]> {
  const slugToId = await buildSlugToIdMap(workspaceId);
  const pawkitId = slugToId.get(pawkitSlug);
  if (!pawkitId) return [];

  const allCollections = await db.collections
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();

  const descendants: string[] = [];

  function findChildren(parentId: string) {
    const children = allCollections.filter((c) => c.parentId === parentId);
    for (const child of children) {
      descendants.push(child.slug);
      findChildren(child.id);
    }
  }

  findChildren(pawkitId);
  return descendants;
}

/**
 * Get cards in a Pawkit (leaf-only display - excludes cards in child Pawkits)
 */
export async function getCardsInPawkit(
  pawkitSlug: string,
  workspaceId: string
): Promise<LocalCard[]> {
  const descendants = await getDescendantSlugs(pawkitSlug, workspaceId);

  return db.cards
    .where('tags')
    .equals(pawkitSlug)
    .filter(
      (card) =>
        card.workspaceId === workspaceId &&
        !card._deleted &&
        !descendants.some((d) => card.tags.includes(d))
    )
    .toArray();
}

/**
 * Get cards in a Pawkit INCLUDING all nested children
 */
export async function getCardsInPawkitRecursive(
  pawkitSlug: string,
  workspaceId: string
): Promise<LocalCard[]> {
  const descendants = await getDescendantSlugs(pawkitSlug, workspaceId);
  const allSlugs = [pawkitSlug, ...descendants];

  return db.cards
    .where('tags')
    .anyOf(allSlugs)
    .filter((card) => card.workspaceId === workspaceId && !card._deleted)
    .toArray();
}

/**
 * Check if a slug corresponds to an existing Pawkit
 */
export async function isPawkitSlug(
  slug: string,
  workspaceId: string
): Promise<boolean> {
  const collection = await db.collections
    .where('[workspaceId+slug]')
    .equals([workspaceId, slug])
    .first();

  return !!collection && !collection._deleted;
}
