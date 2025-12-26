import { Globe, FileText, StickyNote } from 'lucide-react';
import type { LocalCard } from '@/lib/db';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum height for cards without images (more substantial) */
export const MIN_THUMBNAIL_HEIGHT = 240;

/** Default aspect ratio (16:10) until image loads */
export const DEFAULT_ASPECT_RATIO = 16 / 10;

// =============================================================================
// TYPES
// =============================================================================

/** Card display settings interface */
export interface CardDisplaySettings {
  cardPadding: number;         // 0-40 pixels
  showMetadataFooter: boolean; // Show title/tags inside card
  showUrlPill: boolean;        // Show URL pill overlay
  showTitles: boolean;         // Show title text
  showTags: boolean;           // Show tag pills
}

/** Default display settings */
export const DEFAULT_CARD_DISPLAY: CardDisplaySettings = {
  cardPadding: 10,
  showMetadataFooter: true,
  showUrlPill: true,
  showTitles: true,
  showTags: true,
};

export interface CardItemProps {
  card: LocalCard;
  variant?: 'grid' | 'list';
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  uniformHeight?: boolean; // For grid view - crops images to fit uniform aspect ratio
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate relative luminance of an RGB color
 * Returns value between 0 (black) and 1 (white)
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Sample average color from an image using canvas
 */
export function getAverageColor(img: HTMLImageElement): { r: number; g: number; b: number } | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Sample at small size for performance
    const size = 50;
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size).data;

    let r = 0, g = 0, b = 0;
    const pixelCount = size * size;

    for (let i = 0; i < imageData.length; i += 4) {
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
    }

    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount),
    };
  } catch {
    return null;
  }
}

/**
 * Get icon component for card type
 */
export function getCardIcon(type: string) {
  switch (type) {
    case 'url':
      return Globe;
    case 'md-note':
    case 'text-note':
      return FileText;
    case 'quick-note':
      return StickyNote;
    default:
      return Globe;
  }
}

/**
 * Extract domain from URL
 */
export function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Strip HTML tags and get plain text preview
 */
export function getTextPreview(html: string, maxLength: number = 200): string {
  if (!html) return '';
  // Strip HTML tags
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Check if card is a note type
 */
export function isNoteCard(type: string): boolean {
  return type === 'md-note' || type === 'text-note' || type === 'quick-note';
}
