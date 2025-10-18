/**
 * Extract hashtags from markdown content
 * Supports standard #tag format
 */

const TAG_REGEX = /#([a-zA-Z0-9_-]+)/g;

/**
 * Extract all unique tags from markdown content
 */
export function extractTags(content: string): string[] {
  if (!content) return [];

  const tags = new Set<string>();
  let match;

  // Reset regex state
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(content)) !== null) {
    const tag = match[1].toLowerCase(); // Normalize to lowercase
    tags.add(tag);
  }

  return Array.from(tags).sort();
}

/**
 * Get tag autocomplete suggestions
 */
export function getTagSuggestions(
  input: string,
  existingTags: string[]
): string[] {
  const normalized = input.toLowerCase().replace(/^#/, '').trim();

  if (!normalized) return existingTags.slice(0, 10);

  return existingTags
    .filter(tag => tag.toLowerCase().includes(normalized))
    .slice(0, 10);
}

/**
 * Format tag for display
 */
export function formatTag(tag: string): string {
  return `#${tag}`;
}

/**
 * Check if a string contains any tags
 */
export function hasTags(content: string): boolean {
  return TAG_REGEX.test(content);
}

/**
 * Count total tags in content
 */
export function countTags(content: string): number {
  return extractTags(content).length;
}

/**
 * Replace tags with clickable links in HTML
 */
export function makeTagsClickable(
  content: string,
  onTagClick: (tag: string) => void
): string {
  return content.replace(TAG_REGEX, (match, tag) => {
    return `<span class="tag-link" data-tag="${tag}">${match}</span>`;
  });
}
