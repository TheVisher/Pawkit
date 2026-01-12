/**
 * Generic Metadata Extractor
 * Extracts metadata using OG tags, Twitter cards, and JSON-LD structured data
 * Serves as the fallback handler when no site-specific handler is available
 */

import * as cheerio from 'cheerio';
import { MetadataResult, DEFAULT_CONFIG, MetadataConfig } from './types';

// Meta tag priority for images
const IMAGE_META_KEYS = [
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'twitter:image',
  'twitter:image:src',
];

// Meta tag priority for title
const TITLE_META_KEYS = ['og:title', 'twitter:title', 'title'];

// Meta tag priority for description
const DESCRIPTION_META_KEYS = ['og:description', 'twitter:description', 'description'];

// Google favicon service fallback
const FAVICON_ENDPOINT = (url: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;

/**
 * Pick first matching value from meta map based on key priority
 */
function pickFirst(metaMap: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (metaMap[key]) {
      return metaMap[key];
    }
  }
  return undefined;
}

/**
 * Resolve relative URL against base URL
 */
function resolveUrl(base: string, relative: string): string | undefined {
  if (!relative) return undefined;
  try {
    return new URL(relative, base).toString();
  } catch {
    return undefined;
  }
}

/**
 * Validate image URL - check it exists and is under size limit
 * Uses HEAD request for efficiency
 */
async function validateImage(
  imageUrl: string,
  config: Required<MetadataConfig>
): Promise<string | null> {
  if (!imageUrl) return null;

  // Convert HTTP to HTTPS
  if (imageUrl.startsWith('http://')) {
    imageUrl = imageUrl.replace('http://', 'https://');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return null;
    }

    // Check content length (if provided)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > config.maxImageSize) {
      return null;
    }

    return imageUrl;
  } catch {
    return null;
  }
}

/**
 * Extract images from JSON-LD structured data
 * Handles Product schemas and @graph arrays
 */
function extractJsonLdImages(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  existingImages: string[]
): string[] {
  const images = [...existingImages];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonText = $(el).html();
      if (!jsonText) return;
      const data = JSON.parse(jsonText);

      // Handle @graph arrays (common pattern)
      const items = data['@graph'] || [data];

      for (const item of items) {
        const itemType = item['@type'];
        // Handle various product-related types (including arrays like ["Product", "IndividualProduct"])
        const isProduct = Array.isArray(itemType)
          ? itemType.some((t: string) => t.includes('Product') || t === 'ItemPage')
          : itemType?.includes?.('Product') || itemType === 'ItemPage';

        if (isProduct) {
          const productImages = item.image;
          if (Array.isArray(productImages)) {
            for (const img of productImages) {
              const imgUrl = typeof img === 'string' ? img : img?.url;
              if (imgUrl) {
                const resolved = resolveUrl(baseUrl, imgUrl);
                if (resolved && !images.includes(resolved)) {
                  images.push(resolved);
                }
              }
            }
          } else if (typeof productImages === 'string') {
            const resolved = resolveUrl(baseUrl, productImages);
            if (resolved && !images.includes(resolved)) {
              images.push(resolved);
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return images;
}

/**
 * Build meta map from HTML document
 * Maps meta tag properties/names to their content values
 */
function buildMetaMap($: cheerio.CheerioAPI): Record<string, string> {
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
 * Extract favicon from document or fall back to Google service
 */
function extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string {
  const iconLink = $('link[rel*="icon"]').first();
  if (iconLink.length) {
    const href = iconLink.attr('href');
    if (href) {
      const resolved = resolveUrl(baseUrl, href);
      if (resolved) return resolved;
    }
  }
  // Fallback to Google favicon service
  return FAVICON_ENDPOINT(baseUrl);
}

/**
 * Extract domain from URL (without www. prefix)
 */
export function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Fetch and parse HTML from URL
 * Returns null if fetch fails
 */
async function fetchHtml(
  url: string,
  config: Required<MetadataConfig>
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Generic Metadata] Fetch error:', error);
    return null;
  }
}

/**
 * Extract metadata from a URL using generic OG/Twitter/JSON-LD scraping
 * This is the fallback handler for sites without specific handlers
 *
 * @param url - The URL to extract metadata from
 * @param config - Optional configuration overrides
 * @returns MetadataResult with extracted metadata
 */
export async function fetchGenericMetadata(
  url: string,
  config?: MetadataConfig
): Promise<MetadataResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const domain = extractDomain(url);

  const html = await fetchHtml(url, mergedConfig);

  // If fetch failed, return minimal result
  if (!html) {
    return {
      title: null,
      description: null,
      image: null,
      images: null,
      favicon: FAVICON_ENDPOINT(url),
      domain,
      source: 'generic',
      shouldPersistImage: false,
    };
  }

  const $ = cheerio.load(html);
  const metaMap = buildMetaMap($);

  // Extract title
  let title = pickFirst(metaMap, TITLE_META_KEYS);
  if (!title) {
    title = $('title').first().text().trim();
  }

  // Extract description
  const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

  // Extract all images (primary + gallery)
  let allImages: string[] = [];

  // 1. Get all og:image tags (some sites have multiple)
  $('meta[property="og:image"], meta[property="og:image:url"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) {
      const resolved = resolveUrl(url, content);
      if (resolved && !allImages.includes(resolved)) {
        allImages.push(resolved);
      }
    }
  });

  // 2. Extract images from JSON-LD structured data
  allImages = extractJsonLdImages($, url, allImages);

  // 3. Fallback to twitter:image if no images found
  if (allImages.length === 0) {
    const twitterImage = metaMap['twitter:image'] || metaMap['twitter:image:src'];
    if (twitterImage) {
      const resolved = resolveUrl(url, twitterImage);
      if (resolved) allImages.push(resolved);
    }
  }

  // Validate images (limit to first 10 to avoid too many requests)
  const validatedImages: string[] = [];
  for (const imgUrl of allImages.slice(0, 10)) {
    const validated = await validateImage(imgUrl, mergedConfig);
    if (validated) {
      validatedImages.push(validated);
    }
  }

  // Primary image is the first validated one
  const image = validatedImages[0] || null;
  // Additional images (only if more than one)
  const images = validatedImages.length > 1 ? validatedImages : null;

  // Extract favicon
  const favicon = extractFavicon($, url);

  return {
    title: title || null,
    description: description || null,
    image,
    images,
    favicon,
    domain,
    source: 'generic',
    shouldPersistImage: !!image,
  };
}
