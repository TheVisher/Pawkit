import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// =================================================================
// METADATA SCRAPING ACTIONS
// =================================================================

/**
 * Scrape metadata from a URL for a card.
 * This is an internal action scheduled after card creation.
 */
export const scrape = internalAction({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    // Get the card
    const card = await ctx.runQuery(internal.cards.getInternal, { cardId });
    if (!card?.url) return;

    try {
      const metadata = await scrapeUrl(card.url);

      // Update the card with scraped metadata
      await ctx.runMutation(internal.cards.updateMetadata, {
        cardId,
        title: metadata.title || undefined,
        description: metadata.description || undefined,
        image: metadata.image || undefined,
        images: metadata.images || undefined,
        favicon: metadata.favicon || undefined,
        domain: metadata.domain || undefined,
        status: "READY",
        metadata: metadata.raw || undefined,
      });
    } catch (error) {
      console.error("Failed to scrape metadata for card:", cardId, error);

      // Mark card as error
      await ctx.runMutation(internal.cards.updateMetadata, {
        cardId,
        status: "ERROR",
      });
    }
  },
});

/**
 * Scrape article content from a URL (for reader mode).
 */
export const scrapeArticle = internalAction({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.runQuery(internal.cards.getInternal, { cardId });
    if (!card?.url) return;

    try {
      const article = await extractArticle(card.url);

      if (article.content) {
        await ctx.runMutation(internal.cards.updateMetadata, {
          cardId,
          articleContent: article.content,
          wordCount: article.wordCount,
          readingTime: article.readingTime,
        });
      }
    } catch (error) {
      console.error("Failed to scrape article for card:", cardId, error);
    }
  },
});

// =================================================================
// HELPER FUNCTIONS
// =================================================================

interface ScrapedMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  images: string[];
  favicon: string | null;
  domain: string;
  raw: Record<string, unknown>;
}

/**
 * Check if URL is a YouTube URL.
 */
function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes("youtube.com") || hostname === "youtu.be";
  } catch {
    return false;
  }
}

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");
      if (videoId) return videoId;

      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }

    if (hostname === "youtu.be") {
      const videoId = urlObj.pathname.slice(1).split("/")[0];
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch YouTube metadata using oEmbed API and thumbnail URL generation.
 */
async function scrapeYouTube(url: string): Promise<ScrapedMetadata> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // Fetch oEmbed for title and author
  let title: string | null = null;
  let author: string | null = null;

  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oEmbedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      },
    });

    if (response.ok) {
      const data = await response.json();
      title = data.title || null;
      author = data.author_name || null;
    }
  } catch {
    // oEmbed failed, will use fallback title
  }

  // Generate thumbnail URL (always available for valid video IDs)
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    title: title || `YouTube Video - ${videoId}`,
    description: author ? `by ${author}` : null,
    image: thumbnailUrl,
    images: [thumbnailUrl],
    favicon: "https://www.youtube.com/favicon.ico",
    domain: "youtube.com",
    raw: {
      ogTitle: title,
      ogDescription: author ? `by ${author}` : null,
      ogImage: thumbnailUrl,
      ogType: "video",
      ogSiteName: "YouTube",
    },
  };
}

/**
 * Scrape metadata from a URL.
 */
async function scrapeUrl(url: string): Promise<ScrapedMetadata> {
  // Handle YouTube URLs specially (oEmbed + thumbnail generation)
  if (isYouTubeUrl(url)) {
    return scrapeYouTube(url);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch URL: " + response.status);
  }

  const html = await response.text();
  const domain = new URL(url).hostname;

  // Parse HTML for metadata
  const title = extractMetaContent(html, [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    "title",
  ]);

  const description = extractMetaContent(html, [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
  ]);

  const image = extractMetaContent(html, [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ]);

  const favicon = extractFavicon(html, url);

  // Extract all images
  const images = extractImages(html, url);

  return {
    title,
    description,
    image: image ? resolveUrl(image, url) : null,
    images,
    favicon,
    domain,
    raw: {
      ogTitle: extractMetaContent(html, ['meta[property="og:title"]']),
      ogDescription: extractMetaContent(html, [
        'meta[property="og:description"]',
      ]),
      ogImage: extractMetaContent(html, ['meta[property="og:image"]']),
      ogType: extractMetaContent(html, ['meta[property="og:type"]']),
      ogSiteName: extractMetaContent(html, ['meta[property="og:site_name"]']),
    },
  };
}

/**
 * Extract meta content from HTML using simple regex patterns.
 */
function extractMetaContent(
  html: string,
  selectors: string[]
): string | null {
  for (const selector of selectors) {
    let match: RegExpMatchArray | null = null;

    if (selector === "title") {
      match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match) return match[1].trim();
    } else if (selector.includes('property="')) {
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (prop) {
        const regex = new RegExp(
          '<meta[^>]*property=["\']' + prop + '["\'][^>]*content=["\']([^"\']+)["\']',
          "i"
        );
        match = html.match(regex);
        if (!match) {
          // Try content before property
          const regex2 = new RegExp(
            '<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']' + prop + '["\']',
            "i"
          );
          match = html.match(regex2);
        }
      }
    } else if (selector.includes('name="')) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name) {
        const regex = new RegExp(
          '<meta[^>]*name=["\']' + name + '["\'][^>]*content=["\']([^"\']+)["\']',
          "i"
        );
        match = html.match(regex);
        if (!match) {
          const regex2 = new RegExp(
            '<meta[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']' + name + '["\']',
            "i"
          );
          match = html.match(regex2);
        }
      }
    }

    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

/**
 * Extract favicon from HTML.
 */
function extractFavicon(html: string, baseUrl: string): string | null {
  // Try to find favicon in link tags
  const patterns = [
    /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return resolveUrl(match[1], baseUrl);
    }
  }

  // Default to /favicon.ico
  try {
    const parsedUrl = new URL(baseUrl);
    return parsedUrl.protocol + "//" + parsedUrl.host + "/favicon.ico";
  } catch {
    return null;
  }
}

/**
 * Extract images from HTML.
 */
function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  // Extract og:image
  const ogImage = extractMetaContent(html, ['meta[property="og:image"]']);
  if (ogImage) {
    const resolved = resolveUrl(ogImage, baseUrl);
    if (resolved && !seen.has(resolved)) {
      images.push(resolved);
      seen.add(resolved);
    }
  }

  // Extract img tags (limit to first 10)
  const imgRegex = /<img[^>]*src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null && images.length < 10) {
    const src = match[1];
    if (src && !src.startsWith("data:")) {
      const resolved = resolveUrl(src, baseUrl);
      if (resolved && !seen.has(resolved)) {
        images.push(resolved);
        seen.add(resolved);
      }
    }
  }

  return images;
}

/**
 * Resolve a relative URL to absolute.
 */
function resolveUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Decode HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

interface ArticleContent {
  content: string | null;
  wordCount: number;
  readingTime: number;
}

/**
 * Extract article content from a URL.
 * This is a simplified implementation - in production, use @mozilla/readability
 */
async function extractArticle(url: string): Promise<ArticleContent> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch URL: " + response.status);
  }

  const html = await response.text();

  // Simple extraction: get content from article or main tags
  let content = extractMainContent(html);

  if (!content) {
    return { content: null, wordCount: 0, readingTime: 0 };
  }

  // Clean up the content
  content = cleanHtml(content);

  // Calculate word count and reading time
  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

  return { content, wordCount, readingTime };
}

/**
 * Extract main content from HTML.
 */
function extractMainContent(html: string): string | null {
  // Try article tag first
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];

  // Try main tag
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  // Try content div
  const contentMatch = html.match(
    /<div[^>]*(?:class|id)=["'][^"']*(?:content|article|post)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (contentMatch) return contentMatch[1];

  return null;
}

/**
 * Clean HTML content.
 */
function cleanHtml(html: string): string {
  return html
    // Remove scripts
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove styles
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove nav, footer, aside
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    // Clean up whitespace
    .replace(/\s+/g, " ")
    .trim();
}
