/**
 * Metadata Fetcher
 * Main entry point for metadata extraction
 * Detects site type from URL and routes to appropriate handler
 */

import { MetadataResult, SiteType, MetadataConfig } from './types';
import { fetchGenericMetadata, extractDomain } from './generic';
import { getHandler, hasHandler } from './handlers';

/**
 * Site detection patterns
 * Maps hostname patterns to site types
 */
const SITE_PATTERNS: Array<{ pattern: RegExp; site: SiteType }> = [
  // YouTube
  { pattern: /^(www\.)?(youtube\.com|youtu\.be)$/i, site: 'youtube' },
  // Reddit
  { pattern: /^(www\.|old\.|new\.)?reddit\.com$/i, site: 'reddit' },
  { pattern: /^(www\.)?redd\.it$/i, site: 'reddit' },
  // TikTok
  { pattern: /^(www\.|vm\.)?tiktok\.com$/i, site: 'tiktok' },
  // Amazon (various TLDs)
  { pattern: /^(www\.)?amazon\.(com|co\.uk|de|fr|es|it|ca|com\.au|co\.jp|in)$/i, site: 'amazon' },
  // Twitter/X
  { pattern: /^(www\.)?(twitter\.com|x\.com)$/i, site: 'twitter' },
  // Instagram
  { pattern: /^(www\.)?instagram\.com$/i, site: 'instagram' },
  // GitHub
  { pattern: /^(www\.)?github\.com$/i, site: 'github' },
];

/**
 * Detect the site type from a URL's hostname
 *
 * @param url - The URL to analyze
 * @returns The detected SiteType or 'generic' if no match
 */
export function detectSite(url: string): SiteType {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    for (const { pattern, site } of SITE_PATTERNS) {
      if (pattern.test(hostname)) {
        return site;
      }
    }
  } catch {
    // Invalid URL, fall back to generic
  }

  return 'generic';
}

/**
 * Fetch metadata from a URL
 * Automatically detects site type and uses the appropriate handler
 * Falls back to generic OG/Twitter/JSON-LD scraping if no specific handler exists
 *
 * This function is designed to return quickly and not block on operations
 * like image persistence. The `shouldPersistImage` flag in the result
 * indicates if the caller should trigger background image persistence.
 *
 * @param url - The URL to extract metadata from
 * @param config - Optional configuration overrides
 * @returns Promise resolving to MetadataResult
 *
 * @example
 * ```typescript
 * const metadata = await fetchMetadata('https://youtube.com/watch?v=abc123');
 * console.log(metadata.source); // 'youtube-api' or 'generic'
 *
 * // Handle background image persistence
 * if (metadata.shouldPersistImage && metadata.image) {
 *   queueImagePersistence(metadata.image);
 * }
 * ```
 */
export async function fetchMetadata(
  url: string,
  config?: MetadataConfig
): Promise<MetadataResult> {
  // Detect site type
  const siteType = detectSite(url);

  // Check for site-specific handler
  if (siteType !== 'generic' && hasHandler(siteType)) {
    const handler = getHandler(siteType);
    if (handler) {
      try {
        return await handler(url);
      } catch (error) {
        console.error(`[Metadata Fetcher] ${siteType} handler failed, falling back to generic:`, error);
        // Fall through to generic handler
      }
    }
  }

  // Use generic handler
  return fetchGenericMetadata(url, config);
}

/**
 * Fetch metadata with explicit site type override
 * Useful when you want to force a specific handler or test handlers directly
 *
 * @param url - The URL to extract metadata from
 * @param siteType - The site type to use (overrides auto-detection)
 * @param config - Optional configuration overrides
 * @returns Promise resolving to MetadataResult
 */
export async function fetchMetadataWithHandler(
  url: string,
  siteType: SiteType,
  config?: MetadataConfig
): Promise<MetadataResult> {
  if (siteType !== 'generic' && hasHandler(siteType)) {
    const handler = getHandler(siteType);
    if (handler) {
      return handler(url);
    }
  }

  return fetchGenericMetadata(url, config);
}

/**
 * Validate a URL for metadata fetching
 * Checks for valid format and blocks private/internal IPs (SSRF protection)
 *
 * @param url - The URL to validate
 * @returns Object with success status and optional error message
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  // Check URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP(S) protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { valid: false, error: 'Only HTTP(S) URLs allowed' };
  }

  // SSRF Protection: Block private/internal IPs
  if (isPrivateIP(parsedUrl.hostname)) {
    return { valid: false, error: 'Cannot fetch private/internal URLs' };
  }

  return { valid: true };
}

/**
 * Check if hostname is a private/internal IP address
 * Prevents SSRF attacks by blocking requests to internal network
 */
function isPrivateIP(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();

  // Block hostnames that could resolve to internal IPs
  const BLOCKED_HOSTNAMES = ['localhost', 'localhost.localdomain', 'local', 'internal'];

  if (BLOCKED_HOSTNAMES.some((h) => lowerHost === h || lowerHost.endsWith('.' + h))) {
    return true;
  }

  const BLOCKED_PATTERNS = [
    // IPv4 localhost and loopback (entire 127.0.0.0/8 range)
    '127.',
    '0.0.0.0',
    '0.',
    // IPv4 private ranges
    '10.',
    '172.16.',
    '172.17.',
    '172.18.',
    '172.19.',
    '172.20.',
    '172.21.',
    '172.22.',
    '172.23.',
    '172.24.',
    '172.25.',
    '172.26.',
    '172.27.',
    '172.28.',
    '172.29.',
    '172.30.',
    '172.31.',
    '192.168.',
    // AWS/cloud metadata service
    '169.254.',
    // Link-local
    '224.',
    '239.',
    // IPv6 patterns
    '[::1]', // localhost
    '[::', // shorthand IPv6
    '[0:', // IPv6 starting with 0
    '[fe80:', // link-local
    '[fc00:', // unique local
    '[fd', // unique local (fd00::/8)
    'fe80:', // link-local without brackets
    'fc00:',
    'fd00:',
    '::1', // localhost without brackets
  ];

  return BLOCKED_PATTERNS.some((pattern) => lowerHost.startsWith(pattern));
}

// Re-export commonly used utilities
export { extractDomain } from './generic';
