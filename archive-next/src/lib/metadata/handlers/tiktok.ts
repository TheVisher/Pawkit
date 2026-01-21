/**
 * TikTok Metadata Handler
 * Extracts metadata from TikTok video and photo posts
 *
 * Strategy:
 * 1. Primary: oEmbed API (fast, reliable for videos)
 * 2. Fallback: HTML scraping with Cheerio (for photo posts or when oEmbed fails)
 *
 * IMPORTANT: Always sets shouldPersistImage: true because TikTok CDN URLs expire!
 * The x-expires parameter in TikTok thumbnail URLs indicates short-lived URLs.
 */

import * as cheerio from 'cheerio';
import { MetadataResult, DEFAULT_CONFIG } from '../types';
import { extractDomain } from '../generic';

// TikTok oEmbed endpoint
const TIKTOK_OEMBED_URL = 'https://www.tiktok.com/oembed';

// TikTok favicon (static, doesn't expire)
const TIKTOK_FAVICON = 'https://www.tiktok.com/favicon.ico';

// Meta keys for fallback scraping
const IMAGE_META_KEYS = ['og:image', 'twitter:image', 'twitter:image:src'];

/**
 * oEmbed response structure from TikTok
 */
interface TikTokOEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  provider_name?: string;
}

/**
 * Check if URL is a TikTok URL
 */
export function isTikTokUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('tiktok.com');
  } catch {
    return false;
  }
}

/**
 * Fetch metadata using TikTok oEmbed API
 * This is the preferred method - fast and returns reliable thumbnails
 */
async function fetchOEmbed(url: string): Promise<TikTokOEmbedResponse | null> {
  const oembedUrl = `${TIKTOK_OEMBED_URL}?url=${encodeURIComponent(url)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': DEFAULT_CONFIG.userAgent,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[TikTok] oEmbed failed with status:', response.status);
      return null;
    }

    return (await response.json()) as TikTokOEmbedResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[TikTok] oEmbed fetch error:', error);
    return null;
  }
}

/**
 * Fallback: Scrape TikTok page HTML for metadata
 * Used when oEmbed fails (blocked, photo posts, etc.)
 */
async function scrapeTikTokPage(url: string): Promise<MetadataResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_CONFIG.userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[TikTok] Scrape failed with status:', response.status);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Build meta map
    const metaMap: Record<string, string> = {};
    $('meta').each((_, el) => {
      const $el = $(el);
      const property = $el.attr('property') || $el.attr('name');
      const content = $el.attr('content');
      if (property && content) {
        metaMap[property.toLowerCase()] = content.trim();
      }
    });

    // Extract title
    let title = metaMap['og:title'] || metaMap['twitter:title'];
    if (!title) {
      title = $('title').first().text().trim();
    }

    // Extract description
    const description =
      metaMap['og:description'] || metaMap['twitter:description'] || metaMap['description'];

    // Extract image
    let image: string | null = null;
    for (const key of IMAGE_META_KEYS) {
      if (metaMap[key]) {
        image = metaMap[key];
        break;
      }
    }

    return {
      title: title || 'TikTok Content',
      description: description || 'View on TikTok',
      image,
      images: null,
      favicon: TIKTOK_FAVICON,
      domain: 'tiktok.com',
      source: 'tiktok-scrape',
      shouldPersistImage: true, // CRITICAL: TikTok CDN URLs expire!
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[TikTok] Scrape error:', error);
    return null;
  }
}

/**
 * Fetch TikTok metadata
 * Primary: oEmbed API (fast, reliable)
 * Fallback: HTML scraping
 *
 * @param url - TikTok video or photo URL
 * @returns MetadataResult with TikTok content metadata
 */
export async function fetchTikTokMetadata(url: string): Promise<MetadataResult> {
  const domain = extractDomain(url);

  // Primary method: oEmbed API
  const oembedData = await fetchOEmbed(url);

  if (oembedData) {
    return {
      title: oembedData.title || 'TikTok Video',
      description: oembedData.author_name ? `By ${oembedData.author_name}` : 'Watch on TikTok',
      image: oembedData.thumbnail_url || null,
      images: null,
      favicon: TIKTOK_FAVICON,
      domain,
      source: 'tiktok-oembed',
      shouldPersistImage: true, // CRITICAL: TikTok CDN URLs expire!
    };
  }

  // Fallback: HTML scraping
  const scrapedData = await scrapeTikTokPage(url);
  if (scrapedData) {
    return scrapedData;
  }

  // Final fallback: Return minimal metadata
  return {
    title: 'TikTok Content',
    description: 'View on TikTok',
    image: null,
    images: null,
    favicon: TIKTOK_FAVICON,
    domain,
    source: 'tiktok-fallback',
    shouldPersistImage: false, // No image to persist
  };
}
