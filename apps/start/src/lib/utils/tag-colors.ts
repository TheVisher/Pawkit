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

// =============================================================================
// LUMINANCE UTILITIES
// =============================================================================

/**
 * Convert HSL to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns RGB values (0-255 each)
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Calculate relative luminance from HSL color
 * Uses WCAG formula for perceived brightness
 * @returns Value from 0 (black) to 1 (white)
 */
function getRelativeLuminance(h: number, s: number, l: number): number {
  const { r, g, b } = hslToRgb(h, s, l);

  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance using WCAG formula
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
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
 * System tags (read, reading time, etc.) get predefined colors.
 * Other tags get hash-based colors.
 * Custom colors can be passed to override the hash-based color.
 *
 * CSS variables must be defined in globals.css:
 * - --tag-saturation
 * - --tag-lightness
 * - --tag-text-saturation
 * - --tag-text-lightness
 *
 * @param tag - The tag string to generate colors for
 * @param customHsl - Optional custom HSL string "h s l" (e.g., "270 60 50") to override hash-based color
 * @returns Object with bg and text color strings
 */
export function getTagColor(tag: string, customHsl?: string): TagColor {
  // Normalize tag for consistent hashing (use base name for hierarchy)
  const normalizedTag = tag.toLowerCase().trim();

  // Check for system tag colors first (these cannot be customized)
  const systemColor = SYSTEM_TAG_COLORS[normalizedTag];
  if (systemColor) {
    return {
      bg: `hsl(${systemColor.hue} var(--tag-saturation) var(--tag-lightness))`,
      text: `hsl(${systemColor.hue} var(--tag-text-saturation) var(--tag-text-lightness))`,
    };
  }

  // Check for reading time tags (3m, 5m, 8m, etc.) - these cannot be customized
  if (isReadingTimeTag(tag)) {
    return {
      bg: `hsl(${READING_TIME_HUE} var(--tag-saturation) var(--tag-lightness))`,
      text: `hsl(${READING_TIME_HUE} var(--tag-text-saturation) var(--tag-text-lightness))`,
    };
  }

  // Use custom color if provided
  if (customHsl) {
    const [h, s, l] = customHsl.split(' ').map(Number);
    // Calculate luminance to determine if text should be dark or light
    const luminance = getRelativeLuminance(h, s, l);
    // Use 0.4 threshold (slightly lower than 0.5) to ensure readability
    // Bright backgrounds get dark text, dark backgrounds get light text
    const textColor = luminance > 0.4
      ? 'hsl(0 0% 10%)'   // Dark text for bright backgrounds
      : 'hsl(0 0% 95%)';  // Light text for dark backgrounds
    return {
      bg: `hsl(${h} ${s}% ${l}%)`,
      text: textColor,
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
 *
 * @param tag - The tag string to generate styles for
 * @param customHsl - Optional custom HSL string "h s l" to override hash-based color
 */
export function getTagStyle(tag: string, customHsl?: string): React.CSSProperties {
  const colors = getTagColor(tag, customHsl);
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
