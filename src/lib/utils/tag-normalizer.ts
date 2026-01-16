/**
 * Tag Normalizer Utility
 * Handles case normalization, validation, and fuzzy matching for tags
 */

/**
 * Normalize a tag for comparison (lowercase, trimmed)
 */
export function normalizeForComparison(tag: string): string {
  return tag.toLowerCase().trim();
}

/**
 * Clean a tag input (trim, collapse spaces, validate)
 */
export function cleanTagInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/\/+/g, '/') // Collapse multiple slashes
    .replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
}

// Maximum nesting depth for hierarchical tags (e.g., a/b/c/d/e = 5 levels)
const MAX_TAG_DEPTH = 5;

/**
 * Validate a tag string
 * Returns null if valid, error message if invalid
 */
export function validateTag(tag: string): string | null {
  const cleaned = cleanTagInput(tag);

  if (cleaned.length === 0) {
    return 'Tag cannot be empty';
  }

  if (cleaned.length > 50) {
    return 'Tag cannot exceed 50 characters';
  }

  // Only allow alphanumeric, spaces, hyphens, underscores, and slashes
  if (!/^[a-zA-Z0-9\s\-_/]+$/.test(cleaned)) {
    return 'Tag can only contain letters, numbers, spaces, hyphens, underscores, and slashes';
  }

  // Check nesting depth
  const depth = cleaned.split('/').filter(Boolean).length;
  if (depth > MAX_TAG_DEPTH) {
    return `Tag hierarchy cannot exceed ${MAX_TAG_DEPTH} levels`;
  }

  return null;
}

/**
 * Find an existing tag that matches the input (case-insensitive)
 * Returns the existing tag if found, null otherwise
 */
export function findExistingTag(
  input: string,
  existingTags: string[]
): string | null {
  const normalizedInput = normalizeForComparison(input);

  for (const tag of existingTags) {
    if (normalizeForComparison(tag) === normalizedInput) {
      return tag;
    }
  }

  return null;
}

/**
 * Get the canonical form of a tag
 * If the tag already exists (case-insensitive), return the existing version
 * Otherwise, return the cleaned input
 */
export function getCanonicalTag(
  input: string,
  existingTags: string[]
): string {
  const cleaned = cleanTagInput(input);
  const existing = findExistingTag(cleaned, existingTags);
  return existing ?? cleaned;
}

/**
 * Simple fuzzy match for filtering tags
 * Returns true if the tag contains all characters from the query in order
 */
export function fuzzyMatch(tag: string, query: string): boolean {
  const normalizedTag = normalizeForComparison(tag);
  const normalizedQuery = normalizeForComparison(query);

  if (!normalizedQuery) return true;

  // First check for substring match (faster)
  if (normalizedTag.includes(normalizedQuery)) {
    return true;
  }

  // Then do character-by-character fuzzy match
  let queryIndex = 0;
  for (const char of normalizedTag) {
    if (char === normalizedQuery[queryIndex]) {
      queryIndex++;
      if (queryIndex === normalizedQuery.length) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Score a fuzzy match (higher is better)
 * Used for sorting search results
 */
export function fuzzyMatchScore(tag: string, query: string): number {
  const normalizedTag = normalizeForComparison(tag);
  const normalizedQuery = normalizeForComparison(query);

  if (!normalizedQuery) return 0;

  // Exact match is best
  if (normalizedTag === normalizedQuery) {
    return 1000;
  }

  // Starts with query is very good
  if (normalizedTag.startsWith(normalizedQuery)) {
    return 900 - normalizedTag.length;
  }

  // Contains query is good
  const containsIndex = normalizedTag.indexOf(normalizedQuery);
  if (containsIndex >= 0) {
    return 800 - containsIndex - normalizedTag.length;
  }

  // Fuzzy match - count consecutive matches
  let score = 0;
  let consecutive = 0;
  let queryIndex = 0;

  for (const char of normalizedTag) {
    if (char === normalizedQuery[queryIndex]) {
      consecutive++;
      score += consecutive * 10; // Bonus for consecutive matches
      queryIndex++;
      if (queryIndex === normalizedQuery.length) {
        break;
      }
    } else {
      consecutive = 0;
    }
  }

  // Penalize longer tags slightly
  return score > 0 ? score - normalizedTag.length : 0;
}

/**
 * Filter and sort tags by fuzzy match
 */
export function filterTagsByQuery(
  tags: string[],
  query: string,
  limit = 10
): string[] {
  if (!query.trim()) {
    return tags.slice(0, limit);
  }

  return tags
    .filter((tag) => fuzzyMatch(tag, query))
    .sort((a, b) => fuzzyMatchScore(b, query) - fuzzyMatchScore(a, query))
    .slice(0, limit);
}

/**
 * Check if a tag is a duplicate (case-insensitive) of any existing tag
 */
export function isDuplicateTag(
  tag: string,
  existingTags: string[]
): boolean {
  return findExistingTag(tag, existingTags) !== null;
}

/**
 * Detect if a tag looks like a corrupted slug (e.g., "name-1768120212610")
 * This happens when the extension fallback uses collection ID instead of slug
 * Pattern: alphanumeric-word followed by a 13-digit timestamp
 */
export function isCorruptedTag(tag: string): boolean {
  // Match pattern: word-13digitTimestamp (where timestamp is 1600000000000 to 2000000000000)
  // This covers timestamps from ~2020 to ~2033
  const corruptedPattern = /^[\w-]+-1[6789]\d{11}$/;
  return corruptedPattern.test(tag);
}

/**
 * Extract the clean tag from a corrupted tag
 * e.g., "pkms-1768120212610" -> "pkms"
 */
export function cleanCorruptedTag(tag: string): string {
  if (!isCorruptedTag(tag)) {
    return tag;
  }
  // Remove the -timestamp suffix
  return tag.replace(/-1[6789]\d{11}$/, '');
}

/**
 * Clean an array of tags, fixing any corrupted ones
 * Returns deduplicated tags with corrupted ones cleaned
 */
export function cleanCorruptedTags(tags: string[]): string[] {
  const cleaned = tags.map(tag => {
    if (isCorruptedTag(tag)) {
      console.warn(`[TagNormalizer] Detected corrupted tag: "${tag}" -> cleaning to "${cleanCorruptedTag(tag)}"`);
      return cleanCorruptedTag(tag);
    }
    return tag;
  });
  // Deduplicate after cleaning (in case "pkms" and "pkms-timestamp" both existed)
  return [...new Set(cleaned)];
}

/**
 * Suggest tag corrections based on existing tags
 * Returns similar existing tags that might be typos
 */
export function suggestSimilarTags(
  input: string,
  existingTags: string[],
  limit = 3
): string[] {
  const normalizedInput = normalizeForComparison(input);

  if (normalizedInput.length < 2) {
    return [];
  }

  return existingTags
    .filter((tag) => {
      const normalizedTag = normalizeForComparison(tag);
      // Don't suggest exact matches
      if (normalizedTag === normalizedInput) return false;
      // Check for similar length and some character overlap
      const lengthDiff = Math.abs(normalizedTag.length - normalizedInput.length);
      if (lengthDiff > 3) return false;
      // Check for character overlap
      const commonChars = [...normalizedInput].filter((c) =>
        normalizedTag.includes(c)
      ).length;
      return commonChars >= normalizedInput.length * 0.6;
    })
    .slice(0, limit);
}
