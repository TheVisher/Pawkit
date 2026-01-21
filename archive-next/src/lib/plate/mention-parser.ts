/**
 * Plate Mention Parser Utility
 *
 * Parses Plate JSON content to extract @ mentions and sync with references.
 */

import type { Descendant, TElement, TText } from 'platejs';
import type { LocalReference } from '@/lib/db';

// Mention types matching Pawkit's mention system
export type MentionType = 'card' | 'pawkit' | 'date';

export interface ParsedMention {
  id: string;
  type: MentionType;
  label: string;
}

/**
 * Check if a node is a text node
 */
function isTextNode(node: Descendant): node is TText {
  return 'text' in node;
}

/**
 * Check if a node is an element node
 */
function isElementNode(node: Descendant): node is TElement {
  return 'type' in node && 'children' in node;
}

/**
 * Recursively find all mention nodes in Plate JSON content
 */
export function findMentionNodesInPlateJSON(content: Descendant[]): ParsedMention[] {
  const mentions: ParsedMention[] = [];

  function traverse(node: Descendant) {
    // Check if this is a mention node (Plate uses 'mention' type)
    if (isElementNode(node) && node.type === 'mention') {
      const id = node.id as string | undefined;
      const value = node.value as string | undefined;
      const mentionType = (node.mentionType as MentionType) || 'card';

      if (id && value) {
        mentions.push({
          id,
          type: mentionType,
          label: value,
        });
      }
    }

    // Recurse into children
    if (isElementNode(node) && node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of content) {
    traverse(node);
  }

  return mentions;
}

/**
 * Get unique mentions from parsed list (deduplicated by id + type)
 */
export function getUniqueMentions(mentions: ParsedMention[]): ParsedMention[] {
  const seen = new Set<string>();
  const unique: ParsedMention[] = [];

  for (const mention of mentions) {
    const key = `${mention.type}:${mention.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(mention);
    }
  }

  return unique;
}

/**
 * Diff current mentions against existing references
 * Returns lists of references to create and delete
 */
export function diffReferences(
  currentMentions: ParsedMention[],
  existingRefs: LocalReference[]
): {
  toCreate: ParsedMention[];
  toDelete: LocalReference[];
} {
  const uniqueMentions = getUniqueMentions(currentMentions);

  // Create a map of existing refs by key
  const existingMap = new Map<string, LocalReference>();
  for (const ref of existingRefs) {
    const key = `${ref.targetType}:${ref.targetId}`;
    existingMap.set(key, ref);
  }

  // Find mentions that need new references
  const toCreate: ParsedMention[] = [];
  const seenKeys = new Set<string>();

  for (const mention of uniqueMentions) {
    const key = `${mention.type}:${mention.id}`;
    seenKeys.add(key);

    if (!existingMap.has(key)) {
      toCreate.push(mention);
    }
  }

  // Find references that should be deleted (no longer in content)
  const toDelete: LocalReference[] = [];
  for (const ref of existingRefs) {
    const key = `${ref.targetType}:${ref.targetId}`;
    if (!seenKeys.has(key)) {
      toDelete.push(ref);
    }
  }

  return { toCreate, toDelete };
}

/**
 * Extract date mentions from parsed mentions
 */
export function extractDateMentions(mentions: ParsedMention[]): string[] {
  return mentions
    .filter((m) => m.type === 'date')
    .map((m) => m.id); // id is ISO date string (YYYY-MM-DD)
}

/**
 * Sync references from Plate editor content
 *
 * This is the main function called after content is saved.
 * It parses the content, diffs against existing refs, and updates accordingly.
 */
export async function syncReferencesFromPlateContent(
  cardId: string,
  workspaceId: string,
  content: Descendant[],
  existingRefs: LocalReference[],
  actions: {
    createReference: (ref: Omit<LocalReference, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalReference>;
    deleteReference: (id: string) => Promise<void>;
    updateCard: (id: string, updates: { scheduledDates?: string[] }) => Promise<void>;
  }
): Promise<void> {
  // Parse mentions from content
  const mentions = findMentionNodesInPlateJSON(content);
  const uniqueMentions = getUniqueMentions(mentions);

  // Diff against existing references
  const { toCreate, toDelete } = diffReferences(uniqueMentions, existingRefs);

  // Create new references
  for (const mention of toCreate) {
    await actions.createReference({
      workspaceId,
      sourceId: cardId,
      targetId: mention.id,
      targetType: mention.type,
      linkText: mention.label,
    });
  }

  // Delete removed references
  for (const ref of toDelete) {
    await actions.deleteReference(ref.id);
  }

  // Update scheduledDates for date mentions
  const dateMentions = extractDateMentions(uniqueMentions);

  // Also include dates from references that weren't deleted
  const existingDateRefs = existingRefs
    .filter((r) => r.targetType === 'date' && !toDelete.includes(r))
    .map((r) => r.targetId);

  const allDates = [...new Set([...dateMentions, ...existingDateRefs])];

  // Update card's scheduledDates
  await actions.updateCard(cardId, { scheduledDates: allDates });
}

export default {
  findMentionNodesInPlateJSON,
  getUniqueMentions,
  diffReferences,
  extractDateMentions,
  syncReferencesFromPlateContent,
};
