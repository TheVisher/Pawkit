/**
 * Tag Colors Utility
 * Generates deterministic, theme-aware colors for tags using CSS variables
 */

import { READ_TAG, SCHEDULED_TAG, DUE_TODAY_TAG, OVERDUE_TAG, CONFLICT_TAG, isReadingTimeTag } from './system-tags';

export interface TagColor {
  bg: string;
  text: string;
}

// =============================================================================
// SYSTEM TAG COLORS
// =============================================================================

/**
 * Predefined colors for system-generated tags
 * These override the hash-based colors for consistency
 */
export const SYSTEM_TAG_COLORS: Record<string, { hue: number; description: string }> = {
  // Read status - green (success/completed)
  [READ_TAG]: { hue: 145, description: 'Read articles' },

  // Schedule tags
  [SCHEDULED_TAG]: { hue: 220, description: 'Scheduled for future' },
  [DUE_TODAY_TAG]: { hue: 35, description: 'Due today' },
  [OVERDUE_TAG]: { hue: 0, description: 'Overdue items' },

  // Sync conflict - amber/yellow warning
  [CONFLICT_TAG]: { hue: 45, description: 'Sync conflict - needs resolution' },

  // These could be used for future status tags
  completed: { hue: 145, description: 'Completed items' },
  done: { hue: 145, description: 'Done items' },

  // Warning/urgent tags - red
  urgent: { hue: 0, description: 'Urgent items' },
};

/** Hue for reading time tags (slate/neutral) */
const READING_TIME_HUE = 220; // Blue-ish slate

/**
 * Generate a deterministic hash from a string
 * Same input always produces same output
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

/**
 * Get deterministic colors for a tag
 * Uses CSS variables for theme reactivity (light/dark mode)
 *
 * System tags (read, reading time, etc.) get predefined colors.
 * Other tags get hash-based colors.
 *
 * CSS variables must be defined in globals.css:
 * - --tag-saturation
 * - --tag-lightness
 * - --tag-text-saturation
 * - --tag-text-lightness
 *
 * @param tag - The tag string to generate colors for
 * @returns Object with bg and text color strings
 */
export function getTagColor(tag: string): TagColor {
  // Normalize tag for consistent hashing (use base name for hierarchy)
  const normalizedTag = tag.toLowerCase().trim();

  // Check for system tag colors first
  const systemColor = SYSTEM_TAG_COLORS[normalizedTag];
  if (systemColor) {
    return {
      bg: `hsl(${systemColor.hue} var(--tag-saturation) var(--tag-lightness))`,
      text: `hsl(${systemColor.hue} var(--tag-text-saturation) var(--tag-text-lightness))`,
    };
  }

  // Check for reading time tags (3m, 5m, 8m, etc.)
  if (isReadingTimeTag(tag)) {
    return {
      bg: `hsl(${READING_TIME_HUE} var(--tag-saturation) var(--tag-lightness))`,
      text: `hsl(${READING_TIME_HUE} var(--tag-text-saturation) var(--tag-text-lightness))`,
    };
  }

  // Generate hue from hash (0-360) for regular tags
  const hash = hashString(normalizedTag);
  const hue = Math.abs(hash % 360);

  // Use CSS variables for theme-aware colors
  return {
    bg: `hsl(${hue} var(--tag-saturation) var(--tag-lightness))`,
    text: `hsl(${hue} var(--tag-text-saturation) var(--tag-text-lightness))`,
  };
}

/**
 * Get inline style object for a tag
 * Convenient for React style prop
 */
export function getTagStyle(tag: string): React.CSSProperties {
  const colors = getTagColor(tag);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  };
}

/**
 * Predefined color palette for common tag categories
 * Optional - use these for specific semantic tags
 */
export const TAG_CATEGORY_HUES: Record<string, number> = {
  // Status tags
  todo: 45,      // Yellow
  done: 145,     // Green
  progress: 200, // Blue
  blocked: 0,    // Red

  // Priority tags
  high: 0,       // Red
  medium: 35,    // Orange
  low: 200,      // Blue

  // Type tags
  dev: 270,      // Purple
  design: 320,   // Pink
  docs: 180,     // Cyan
};

/**
 * Get color for a semantic tag category
 * Falls back to hash-based color if not in predefined list
 */
export function getSemanticTagColor(tag: string): TagColor {
  const baseName = tag.split('/')[0].toLowerCase();
  const predefinedHue = TAG_CATEGORY_HUES[baseName];

  if (predefinedHue !== undefined) {
    return {
      bg: `hsl(${predefinedHue} var(--tag-saturation) var(--tag-lightness))`,
      text: `hsl(${predefinedHue} var(--tag-text-saturation) var(--tag-text-lightness))`,
    };
  }

  return getTagColor(tag);
}
