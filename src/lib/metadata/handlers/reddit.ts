/**
 * Reddit Metadata Handler
 *
 * Implements a 3-tier fallback system for extracting metadata from Reddit URLs:
 * 1. oEmbed API (fastest, but limited thumbnail support)
 * 2. JSON API (most reliable for images, handles galleries/videos/etc)
 * 3. HTML scraping (last resort fallback)
 */

import { MetadataResult, DEFAULT_CONFIG } from '../types';

const REDDIT_FAVICON = 'https://www.reddit.com/favicon.ico';
const TIMEOUT_MS = 10000;

/**
 * User agent for Reddit requests
 * Reddit is more lenient with browser-like user agents
 */
const USER_AGENT = DEFAULT_CONFIG.userAgent;

/**
 * HTML decode utility for Reddit URLs
 * Reddit escapes URLs with &amp; entities
 */
function htmlDecode(str: string): string {
  return str.replace(/&amp;/g, '&');
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'reddit.com';
  }
}

/**
 * Check if a URL is a valid image URL
 */
function isImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) || url.includes('imgur.com');
}

/**
 * Tier 1: oEmbed API
 * Fastest method, but only useful if it returns a thumbnail_url
 */
async function fetchOEmbed(
  url: string
): Promise<{ title: string | null; description: string | null; image: string | null } | null> {
  try {
    const oembedUrl = `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Only return if we have a thumbnail - otherwise fall through to JSON API
    if (data.thumbnail_url) {
      return {
        title: data.title || null,
        description: data.author_name ? `Posted by ${data.author_name}` : null,
        image: data.thumbnail_url,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Reddit post data structure from JSON API
 */
interface RedditPost {
  title?: string;
  subreddit_name_prefixed?: string;
  author?: string;
  is_gallery?: boolean;
  media_metadata?: Record<
    string,
    {
      s?: { u?: string };
    }
  >;
  gallery_data?: {
    items?: Array<{ media_id: string }>;
  };
  post_hint?: string;
  url?: string;
  preview?: {
    images?: Array<{
      source?: { url?: string };
      resolutions?: Array<{ url?: string }>;
    }>;
  };
  is_video?: boolean;
  thumbnail?: string;
}

/**
 * Extract image from Reddit post data
 * Handles various post types: galleries, images, videos, links
 */
function extractImageFromPost(post: RedditPost): { image: string | null; images: string[] | null } {
  let primaryImage: string | null = null;
  const allImages: string[] = [];

  // 1. Gallery posts (check first - most specific)
  if (post.is_gallery && post.media_metadata) {
    const mediaIds = post.gallery_data?.items?.map((item) => item.media_id) || Object.keys(post.media_metadata);

    for (const mediaId of mediaIds) {
      const media = post.media_metadata[mediaId];
      if (media?.s?.u) {
        const imageUrl = htmlDecode(media.s.u);
        allImages.push(imageUrl);
        if (!primaryImage) {
          primaryImage = imageUrl;
        }
      }
    }

    if (primaryImage) {
      return { image: primaryImage, images: allImages.length > 1 ? allImages : null };
    }
  }

  // 2. Direct image posts (i.reddit.it or i.redd.it)
  if (post.post_hint === 'image' && post.url) {
    return { image: post.url, images: null };
  }

  // 3. Preview images (most reliable for various post types)
  if (post.preview?.images?.[0]?.source?.url) {
    return { image: htmlDecode(post.preview.images[0].source.url), images: null };
  }

  // 4. Video posts (use thumbnail)
  if (post.is_video && post.thumbnail && post.thumbnail.startsWith('http')) {
    return { image: post.thumbnail, images: null };
  }

  // 5. External image URLs
  if (post.url && isImageUrl(post.url)) {
    return { image: post.url, images: null };
  }

  // 6. Fallback to thumbnail if available (but not default icons)
  if (post.thumbnail && post.thumbnail.startsWith('http') && !post.thumbnail.includes('default')) {
    return { image: post.thumbnail, images: null };
  }

  return { image: null, images: null };
}

/**
 * Tier 2: JSON API
 * Most reliable for extracting images, especially for galleries
 */
async function fetchJsonApi(url: string): Promise<{
  title: string | null;
  description: string | null;
  image: string | null;
  images: string[] | null;
} | null> {
  try {
    // Construct JSON URL properly
    const jsonUrl = url.endsWith('/') ? `${url}.json` : `${url}/.json`;

    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        console.warn('[Reddit] Rate limited on JSON API');
      }
      return null;
    }

    const data = await response.json();

    // Reddit API returns an array with post data
    const post = data?.[0]?.data?.children?.[0]?.data as RedditPost | undefined;

    if (!post) {
      return null;
    }

    const { image, images } = extractImageFromPost(post);

    return {
      title: post.title || null,
      description: post.subreddit_name_prefixed ? `Posted in ${post.subreddit_name_prefixed}` : null,
      image,
      images,
    };
  } catch (error) {
    // Handle network errors and timeouts gracefully
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('[Reddit] JSON API request timed out');
    }
    return null;
  }
}

/**
 * Tier 3: HTML Scraping
 * Last resort - scrape og:image from the page
 */
async function fetchHtmlScrape(url: string): Promise<{
  title: string | null;
  description: string | null;
  image: string | null;
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract meta tags using regex (lightweight, no DOM parser needed)
    const getMetaContent = (property: string): string | null => {
      // Try property attribute
      const propertyMatch = new RegExp(
        `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`,
        'i'
      ).exec(html);
      if (propertyMatch) return propertyMatch[1];

      // Try content before property
      const reverseMatch = new RegExp(
        `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`,
        'i'
      ).exec(html);
      if (reverseMatch) return reverseMatch[1];

      // Try name attribute
      const nameMatch = new RegExp(
        `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`,
        'i'
      ).exec(html);
      if (nameMatch) return nameMatch[1];

      return null;
    };

    const title =
      getMetaContent('og:title') ||
      getMetaContent('twitter:title') ||
      (/<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] || null);

    const description = getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description');

    const image = getMetaContent('og:image') || getMetaContent('twitter:image');

    if (title || description || image) {
      return { title, description, image };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Main Reddit metadata handler
 * Implements 3-tier fallback: oEmbed -> JSON API -> HTML scrape
 */
export async function handleReddit(url: string): Promise<MetadataResult> {
  const domain = extractDomain(url);

  // Tier 1: Try oEmbed first (fastest)
  const oembedResult = await fetchOEmbed(url);
  if (oembedResult?.image) {
    return {
      title: oembedResult.title,
      description: oembedResult.description,
      image: oembedResult.image,
      images: null,
      favicon: REDDIT_FAVICON,
      domain,
      source: 'reddit-oembed',
      shouldPersistImage: false, // Reddit URLs are stable
    };
  }

  // Tier 2: Try JSON API (most reliable for images)
  const jsonResult = await fetchJsonApi(url);
  if (jsonResult?.image || jsonResult?.title) {
    return {
      title: jsonResult.title,
      description: jsonResult.description,
      image: jsonResult.image,
      images: jsonResult.images,
      favicon: REDDIT_FAVICON,
      domain,
      source: 'reddit-json',
      shouldPersistImage: false, // Reddit URLs are stable
    };
  }

  // Tier 3: Try HTML scraping (last resort)
  const scrapeResult = await fetchHtmlScrape(url);
  if (scrapeResult?.image || scrapeResult?.title) {
    return {
      title: scrapeResult.title,
      description: scrapeResult.description,
      image: scrapeResult.image,
      images: null,
      favicon: REDDIT_FAVICON,
      domain,
      source: 'reddit-scrape',
      shouldPersistImage: false, // Reddit URLs are stable
    };
  }

  // Ultimate fallback - all methods failed
  return {
    title: 'Reddit Post',
    description: 'View on Reddit',
    image: null,
    images: null,
    favicon: REDDIT_FAVICON,
    domain,
    source: 'reddit-fallback',
    shouldPersistImage: false,
  };
}

/**
 * Check if a URL is a Reddit URL
 */
export function isRedditUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('reddit.com') || hostname.includes('redd.it');
  } catch {
    return false;
  }
}

export default handleReddit;
