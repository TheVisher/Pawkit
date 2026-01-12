/**
 * Metadata Extraction Module
 * Provides URL metadata extraction with site-specific handlers and generic fallback
 *
 * @module lib/metadata
 *
 * @example
 * ```typescript
 * import { fetchMetadata, validateUrl } from '@/lib/metadata';
 *
 * // Validate URL first
 * const { valid, error } = validateUrl(url);
 * if (!valid) {
 *   console.error(error);
 *   return;
 * }
 *
 * // Fetch metadata (auto-detects site type)
 * const metadata = await fetchMetadata(url);
 * console.log(metadata.title, metadata.image);
 *
 * // Handle background image persistence if needed
 * if (metadata.shouldPersistImage && metadata.image) {
 *   await persistImageToStorage(metadata.image);
 * }
 * ```
 */

// Main fetcher functions
export {
  fetchMetadata,
  fetchMetadataWithHandler,
  detectSite,
  validateUrl,
  extractDomain,
} from './fetcher';

// Generic handler for direct use
export { fetchGenericMetadata } from './generic';

// Types
export type {
  MetadataResult,
  MetadataHandler,
  MetadataConfig,
  SiteType,
} from './types';

// Config defaults
export { DEFAULT_CONFIG } from './types';

// Handler registry utilities
export {
  getHandler,
  hasHandler,
  registerHandler,
  getRegisteredSites,
} from './handlers';

// Site-specific handler utilities (re-exported from handlers)
export { handleYouTube, extractYouTubeVideoId, isYouTubeUrl } from './handlers';
