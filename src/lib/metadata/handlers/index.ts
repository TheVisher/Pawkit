/**
 * Handler Registry
 * Maps site types to their specific metadata handlers
 * New handlers should be registered here
 */

import { MetadataHandler, SiteType } from '../types';

// Import site-specific handlers
import { handleYouTube, extractYouTubeVideoId, isYouTubeUrl } from './youtube';
import { handleReddit, isRedditUrl } from './reddit';
import { fetchAmazonMetadata, isAmazonUrl, getAmazonDomains } from './amazon';
import { fetchEcommerceMetadata, isEcommerceUrl, getEcommerceDomains } from './ecommerce';
import { fetchTikTokMetadata, isTikTokUrl } from './tiktok';

/**
 * Registry of site-specific metadata handlers
 * Key: SiteType identifier
 * Value: Handler function that extracts metadata for that site
 *
 * To add a new handler:
 * 1. Create a new file in handlers/ (e.g., youtube.ts)
 * 2. Export a handler function matching MetadataHandler interface
 * 3. Import and register it here
 */
const handlers = new Map<SiteType, MetadataHandler>();

// Register site-specific handlers
handlers.set('youtube', handleYouTube);
handlers.set('reddit', handleReddit);
handlers.set('amazon', fetchAmazonMetadata);
handlers.set('ecommerce', fetchEcommerceMetadata);
handlers.set('tiktok', fetchTikTokMetadata);

// Future handlers to be implemented:
// handlers.set('twitter', handleTwitter);
// handlers.set('instagram', handleInstagram);
// handlers.set('github', handleGitHub);

// Re-export YouTube utilities for convenience
export { handleYouTube, extractYouTubeVideoId, isYouTubeUrl };

// Re-export Reddit utilities
export { handleReddit, isRedditUrl };

// Re-export Amazon utilities
export { fetchAmazonMetadata, isAmazonUrl, getAmazonDomains };

// Re-export E-commerce utilities
export { fetchEcommerceMetadata, isEcommerceUrl, getEcommerceDomains };

// Re-export TikTok utilities
export { fetchTikTokMetadata, isTikTokUrl };

/**
 * Get the handler for a specific site type
 *
 * @param siteType - The site type to get a handler for
 * @returns The handler function or undefined if not found
 */
export function getHandler(siteType: SiteType): MetadataHandler | undefined {
  return handlers.get(siteType);
}

/**
 * Check if a handler exists for a specific site type
 *
 * @param siteType - The site type to check
 * @returns True if a handler is registered for this site type
 */
export function hasHandler(siteType: SiteType): boolean {
  return handlers.has(siteType);
}

/**
 * Register a new handler for a site type
 * Primarily used for dynamic registration or testing
 *
 * @param siteType - The site type to register
 * @param handler - The handler function
 */
export function registerHandler(siteType: SiteType, handler: MetadataHandler): void {
  handlers.set(siteType, handler);
}

/**
 * Get all registered site types
 *
 * @returns Array of registered site types
 */
export function getRegisteredSites(): SiteType[] {
  return Array.from(handlers.keys());
}

export { handlers };
