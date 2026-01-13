/**
 * Amazon Metadata Handler
 * Extracts product metadata from Amazon URLs with specialized image extraction
 */

import * as cheerio from 'cheerio';
import type { MetadataResult } from '../types';
import { DEFAULT_CONFIG } from '../types';

// Amazon domains (full domains and short links)
const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.co.uk',
  'amazon.ca',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.co.jp',
  // Short links
  'a.co',
  'amzn.to',
  'amzn.com',
];

/**
 * Check if URL is an Amazon URL
 */
export function isAmazonUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return AMAZON_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Get all Amazon domains for handler registration
 */
export function getAmazonDomains(): string[] {
  return [...AMAZON_DOMAINS];
}

// Amazon-specific image selectors (in priority order)
const AMAZON_IMAGE_SELECTORS = [
  '#landingImage',              // Main product image
  '#imgBlkFront',               // Alternative main image
  '#ebooksImgBlkFront',         // E-book cover
  '.a-dynamic-image',           // Dynamic image container
  'img[data-old-hires]',        // High-res image data
  'img[data-a-dynamic-image]',  // Another dynamic image format
];

// Meta tag priority keys
const TITLE_META_KEYS = ['og:title', 'twitter:title', 'title'];
const DESCRIPTION_META_KEYS = ['og:description', 'twitter:description', 'description'];

// Google favicon service
const FAVICON_ENDPOINT = (url: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;

/**
 * Validate that the parsed JSON has the expected Amazon dynamic image format
 * Format: {"url": [width, height], "url2": [width2, height2], ...}
 */
function isValidDynamicImageFormat(obj: unknown): obj is Record<string, [number, number]> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return false;
  }

  // Check that at least the first entry has the expected format
  const [, firstValue] = entries[0];
  return (
    Array.isArray(firstValue) &&
    firstValue.length >= 2 &&
    typeof firstValue[0] === 'number' &&
    typeof firstValue[1] === 'number'
  );
}

/**
 * Parse Amazon's dynamic image JSON format
 * Format: {"url": [width, height], "url2": [width2, height2], ...}
 * Returns the URL with the largest dimensions
 */
function parseDynamicImageJson(jsonStr: string): string | null {
  try {
    const parsed: unknown = JSON.parse(jsonStr);

    // Validate the parsed structure before using it
    if (!isValidDynamicImageFormat(parsed)) {
      return null;
    }

    const entries = Object.entries(parsed);

    // Find the largest image by comparing width * height
    let largestUrl = entries[0][0];
    let largestSize = entries[0][1][0] * entries[0][1][1];

    for (const [url, dimensions] of entries) {
      // Skip entries that don't have valid dimensions
      if (!Array.isArray(dimensions) || dimensions.length < 2) {
        continue;
      }
      const width = dimensions[0];
      const height = dimensions[1];
      if (typeof width !== 'number' || typeof height !== 'number') {
        continue;
      }
      const size = width * height;
      if (size > largestSize) {
        largestSize = size;
        largestUrl = url;
      }
    }

    return largestUrl;
  } catch {
    return null;
  }
}

/**
 * Extract product image from Amazon page
 */
function extractAmazonImage($: cheerio.CheerioAPI): string | null {
  for (const selector of AMAZON_IMAGE_SELECTORS) {
    const img = $(selector).first();
    if (!img.length) continue;

    // Try data-a-dynamic-image first (contains JSON with multiple sizes)
    const dynamicImageData = img.attr('data-a-dynamic-image');
    if (dynamicImageData && dynamicImageData.startsWith('{')) {
      const parsedUrl = parseDynamicImageJson(dynamicImageData);
      if (parsedUrl) {
        return parsedUrl;
      }
    }

    // Try data-old-hires (high-resolution source)
    const oldHires = img.attr('data-old-hires');
    if (oldHires && !oldHires.startsWith('{')) {
      return oldHires;
    }

    // Fall back to src
    const src = img.attr('src');
    if (src && !src.startsWith('{')) {
      return src;
    }
  }

  return null;
}

/**
 * Extract metadata from meta tags
 */
function extractMetaTags($: cheerio.CheerioAPI): Record<string, string> {
  const metaMap: Record<string, string> = {};

  $('meta').each((_, el) => {
    const $el = $(el);
    const property = $el.attr('property') || $el.attr('name') || $el.attr('itemprop');
    const content = $el.attr('content');

    if (property && content) {
      const key = property.toLowerCase();
      if (!metaMap[key]) {
        metaMap[key] = content.trim();
      }
    }
  });

  return metaMap;
}

/**
 * Pick first matching value from meta map
 */
function pickFirst(metaMap: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    if (metaMap[key]) {
      return metaMap[key];
    }
  }
  return null;
}

/**
 * Resolve relative URL against base
 */
function resolveUrl(base: string, relative: string): string | null {
  if (!relative) return null;
  try {
    return new URL(relative, base).toString();
  } catch {
    return null;
  }
}

/**
 * Fetch and extract metadata from Amazon product page
 */
export async function fetchAmazonMetadata(url: string): Promise<MetadataResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout);

  // Extract domain
  let domain: string;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace('www.', '');
  } catch {
    domain = 'amazon.com';
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Amazon request failed with ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract product image using Amazon-specific selectors
    let productImage = extractAmazonImage($);

    // Extract meta tags
    const metaMap = extractMetaTags($);

    // Fall back to og:image if DOM selectors failed
    if (!productImage) {
      const ogImage = metaMap['og:image'] || metaMap['og:image:url'];
      if (ogImage) {
        productImage = resolveUrl(url, ogImage);
      }
    }

    // Extract title
    let title = pickFirst(metaMap, TITLE_META_KEYS);
    if (!title) {
      // Try Amazon-specific title element
      title = $('#productTitle').text().trim() || $('title').first().text().trim() || null;
    }

    // Extract description
    let description = pickFirst(metaMap, DESCRIPTION_META_KEYS);
    if (!description) {
      // Try Amazon-specific description
      description = $('#productDescription p').first().text().trim() || null;
    }

    // Get favicon
    let favicon: string | null = null;
    const iconLink = $('link[rel*="icon"]').first();
    if (iconLink.length) {
      const href = iconLink.attr('href');
      if (href) {
        favicon = resolveUrl(url, href);
      }
    }
    if (!favicon) {
      favicon = FAVICON_ENDPOINT(url);
    }

    return {
      title: title || 'Amazon Product',
      description: description || 'View on Amazon',
      image: productImage,
      images: productImage ? [productImage] : null,
      favicon,
      domain,
      source: 'amazon-handler',
      shouldPersistImage: false, // E-commerce images are stable
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Amazon Handler] Error:', error);

    // Return partial result
    return {
      title: 'Amazon Product',
      description: 'View on Amazon',
      image: null,
      images: null,
      favicon: FAVICON_ENDPOINT(url),
      domain,
      source: 'amazon-handler',
      shouldPersistImage: false,
    };
  }
}

export default fetchAmazonMetadata;
