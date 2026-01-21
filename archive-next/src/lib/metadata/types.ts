/**
 * Metadata Types
 * Shared type definitions for the metadata extraction system
 */

/**
 * Result from metadata extraction
 * Contains all extracted metadata from a URL
 */
export interface MetadataResult {
  /** Page title from OG, Twitter, or HTML title tag */
  title: string | null;
  /** Page description from OG, Twitter, or meta description */
  description: string | null;
  /** Primary image URL (first validated image) */
  image: string | null;
  /** Gallery images (all validated images including primary) */
  images: string[] | null;
  /** Favicon URL */
  favicon: string | null;
  /** Domain extracted from URL (without www.) */
  domain: string;
  /** Source of metadata extraction (e.g., 'youtube-api', 'reddit-json', 'generic') */
  source: string;
  /** Flag indicating if image should be persisted to storage in background */
  shouldPersistImage?: boolean;
}

/**
 * Handler function type for site-specific metadata extraction
 * Each handler takes a URL and returns metadata specific to that site
 */
export interface MetadataHandler {
  (url: string): Promise<MetadataResult>;
}

/**
 * Site identifier used for routing to specific handlers
 */
export type SiteType =
  | 'youtube'
  | 'reddit'
  | 'tiktok'
  | 'amazon'
  | 'ecommerce'
  | 'twitter'
  | 'instagram'
  | 'github'
  | 'generic';

/**
 * Configuration for metadata fetching
 */
export interface MetadataConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum image size in bytes */
  maxImageSize?: number;
  /** User agent string for requests */
  userAgent?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<MetadataConfig> = {
  timeout: 10000,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};
