/**
 * Portal Drag State
 *
 * Tracks whether a drag operation originated from within the portal (drag-out)
 * vs from an external source (drag-in from browser).
 *
 * This prevents the drop zone from showing when a user is dragging a card
 * OUT of the portal to an external app, and prevents duplicate cards.
 */

let internalDragActive = false;
let draggedCardUrl: string | null = null;
let dragTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Normalize a URL for comparison purposes.
 * Removes tracking parameters and normalizes the URL structure.
 */
export function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking parameters
    const trackingParams = [
      // UTM params
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      // Facebook
      'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
      // Google
      'gclid', 'gclsrc', 'dclid',
      // Amazon
      'tag', 'linkCode', 'linkId', 'ref', 'ref_',
      // Walmart
      'athAsset', 'athena', 'athbdg', 'athenaid',
      // Generic
      'mc_cid', 'mc_eid', 'mkt_tok', 'trk', 'trkid',
      '_ga', '_gl', '_hsenc', '_hsmi',
      'source', 'medium',
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // Normalize: lowercase host, remove trailing slash, remove hash
    let normalized = parsed.protocol + '//' + parsed.host.toLowerCase() + parsed.pathname;

    // Remove trailing slash unless it's the root
    if (normalized.endsWith('/') && normalized.length > parsed.protocol.length + 3) {
      normalized = normalized.slice(0, -1);
    }

    // Add remaining query params if any (sorted for consistency)
    const remainingParams = Array.from(parsed.searchParams.entries()).sort();
    if (remainingParams.length > 0) {
      normalized += '?' + remainingParams.map(([k, v]) => `${k}=${v}`).join('&');
    }

    return normalized;
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Set when a card drag-out starts from within the portal
 * @param active - Whether drag is active
 * @param url - The URL of the card being dragged (used to prevent re-adding same card)
 */
export function setInternalDragActive(active: boolean, url?: string): void {
  // Clear any pending timeout
  if (dragTimeoutId) {
    clearTimeout(dragTimeoutId);
    dragTimeoutId = null;
  }

  internalDragActive = active;

  if (active && url) {
    // Store normalized URL for comparison
    draggedCardUrl = normalizeUrlForComparison(url);
  }

  if (!active) {
    // Keep the URL tracked for a bit longer to handle edge cases
    // where the user drags off and back on
    dragTimeoutId = setTimeout(() => {
      draggedCardUrl = null;
      dragTimeoutId = null;
    }, 2000); // 2 seconds grace period
  }
}

/**
 * Check if an internal drag is currently active
 */
export function isInternalDragActive(): boolean {
  return internalDragActive;
}

/**
 * Check if a URL is currently being dragged from the portal
 * Uses normalized comparison to catch URLs with different tracking params
 */
export function isDraggedUrl(url: string): boolean {
  if (!draggedCardUrl) return false;
  return normalizeUrlForComparison(url) === draggedCardUrl;
}

/**
 * Get the URL of the card currently being dragged (if any)
 */
export function getDraggedCardUrl(): string | null {
  return draggedCardUrl;
}
