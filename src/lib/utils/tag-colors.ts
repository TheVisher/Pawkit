/**
 * Tag Colors Utility
 * Generates deterministic, theme-aware colors for tags using CSS variables
 */

export interface TagColor {
  bg: string;
  text: string;
}

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

  // Generate hue from hash (0-360)
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
