/**
 * Metadata Extraction API
 * Fetches OpenGraph metadata for URLs with resilient fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { checkRateLimit } from '@/lib/rate-limit';

// Force Node.js runtime for fetch
export const runtime = 'nodejs';

// Standard browser User-Agent to avoid bot blocking
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

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

// Google favicon service
const FAVICON_ENDPOINT = (url: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;

// Max image size (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Request timeout (10 seconds)
const FETCH_TIMEOUT = 10000;

/**
 * Check if hostname is a private/internal IP address
 * Prevents SSRF attacks by blocking requests to internal network
 */
function isPrivateIP(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();

  const BLOCKED_PATTERNS = [
    // IPv4 localhost and loopback
    '127.', '0.0.0.0', 'localhost',
    // IPv4 private ranges
    '10.',
    '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.',
    '192.168.',
    // AWS/cloud metadata service
    '169.254.',
    // IPv6 localhost and private
    '[::1]', 'fe80:', 'fc00:', 'fd00::'
  ];

  return BLOCKED_PATTERNS.some(pattern => lowerHost.startsWith(pattern));
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute (metadata fetching is expensive)
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success, remaining } = checkRateLimit(identifier, 60000, 5);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': '0' },
        }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // SSRF Protection: Block private/internal IPs
    if (isPrivateIP(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Cannot fetch private/internal URLs' },
        { status: 400 }
      );
    }

    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP(S) URLs allowed' },
        { status: 400 }
      );
    }

    // Extract domain for response
    const domain = parsedUrl.hostname.replace('www.', '');

    // Check for YouTube - use special handling
    const youtubeVideoId = extractYouTubeVideoId(url);
    if (youtubeVideoId) {
      const metadata = await fetchYouTubeMetadata(url, youtubeVideoId, domain);
      return NextResponse.json(metadata);
    }

    // Fetch and parse HTML
    const metadata = await scrapeMetadata(url, domain);
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('[Metadata API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

/**
 * Scrape metadata from URL using Cheerio
 */
async function scrapeMetadata(url: string, domain: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Build meta map
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

    // Extract title
    let title = pickFirst(metaMap, TITLE_META_KEYS);
    if (!title) {
      title = $('title').first().text().trim();
    }

    // Extract description
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

    // Extract image
    let image: string | null = pickFirst(metaMap, IMAGE_META_KEYS) ?? null;
    if (image) {
      // Resolve relative URLs
      const resolved = resolveUrl(url, image);
      // Validate image
      image = resolved ? await validateImage(resolved) : null;
    }

    // Extract favicon
    let favicon: string | undefined;
    const iconLink = $('link[rel*="icon"]').first();
    if (iconLink.length) {
      const href = iconLink.attr('href');
      if (href) {
        favicon = resolveUrl(url, href);
      }
    }
    // Fallback to Google favicon service
    if (!favicon) {
      favicon = FAVICON_ENDPOINT(url);
    }

    return {
      title: title || null,
      description: description || null,
      image: image || null,
      favicon: favicon || null,
      domain,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Metadata API] Scrape error:', error);

    // Return partial result with at least domain and favicon
    return {
      title: null,
      description: null,
      image: null,
      favicon: FAVICON_ENDPOINT(url),
      domain,
    };
  }
}

/**
 * YouTube special handling - get high-res thumbnails
 */
async function fetchYouTubeMetadata(url: string, videoId: string, domain: string) {
  // Try maxresdefault first (1280x720)
  const thumbnailUrls = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];

  let image: string | null = null;
  for (const thumbUrl of thumbnailUrls) {
    const validated = await validateImage(thumbUrl);
    if (validated) {
      image = validated;
      break;
    }
  }

  // Fetch page for title/description
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  let title: string | null = null;
  let description: string | null = null;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      const metaMap: Record<string, string> = {};
      $('meta').each((_, el) => {
        const $el = $(el);
        const property = $el.attr('property') || $el.attr('name');
        const content = $el.attr('content');
        if (property && content) {
          metaMap[property.toLowerCase()] = content.trim();
        }
      });

      title = pickFirst(metaMap, TITLE_META_KEYS) || $('title').first().text().trim() || null;
      description = pickFirst(metaMap, DESCRIPTION_META_KEYS) || null;
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return {
    title,
    description,
    image,
    favicon: 'https://www.youtube.com/favicon.ico',
    domain,
  };
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com')) {
      // Standard: youtube.com/watch?v=VIDEO_ID
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;

      // Shorts: youtube.com/shorts/VIDEO_ID
      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      // Embed: youtube.com/embed/VIDEO_ID
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('/')[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate image URL - check it exists and is under size limit
 */
async function validateImage(imageUrl: string): Promise<string | null> {
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
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      return null;
    }

    return imageUrl;
  } catch {
    return null;
  }
}

/**
 * Pick first matching value from meta map
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
 * Resolve relative URL against base
 */
function resolveUrl(base: string, relative: string): string | undefined {
  if (!relative) return undefined;
  try {
    return new URL(relative, base).toString();
  } catch {
    return undefined;
  }
}
