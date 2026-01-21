import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as cheerio from "cheerio";

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
 * Internal action scheduled after card creation.
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

/**
 * Public action to extract article content from a URL.
 * Called directly from the frontend for manual extraction/re-extraction.
 */
export const extractArticleAction = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Only allow HTTP(S)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP(S) URLs allowed");
    }

    // Extract article
    const article = await extractArticle(url);

    return {
      success: !!article.content,
      article,
    };
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
  textContent: string | null;
  title: string | null;
  byline: string | null;
  siteName: string | null;
  wordCount: number;
  readingTime: number;
  publishedTime: string | null;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate reading time from word count
 */
function calculateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.ceil(wordCount / 225); // ~225 words per minute
}

/**
 * Extract published time from Cheerio document
 */
function extractPublishedTimeFromCheerio($: cheerio.CheerioAPI): string | null {
  const selectors = [
    'meta[property="article:published_time"]',
    'meta[property="og:article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    'meta[name="DC.date.issued"]',
    'meta[itemprop="datePublished"]',
    'time[datetime]',
    'time[itemprop="datePublished"]',
  ];

  for (const selector of selectors) {
    const elem = $(selector).first();
    if (elem.length) {
      const value = elem.attr('content') || elem.attr('datetime');
      if (value) return value;
    }
  }
  return null;
}

/**
 * Preprocess HTML to remove heavy content before parsing.
 * This prevents memory issues with large pages.
 */
function preprocessHtml(html: string): string {
  // Limit max size to 2MB to prevent memory issues
  const MAX_SIZE = 2 * 1024 * 1024;
  if (html.length > MAX_SIZE) {
    html = html.substring(0, MAX_SIZE);
  }

  // Remove script tags and their contents
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove style tags and their contents
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove noscript tags
  html = html.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  // Remove SVG elements (often huge)
  html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Remove inline event handlers and data attributes (reduce size)
  html = html.replace(/\s+on\w+="[^"]*"/gi, '');
  html = html.replace(/\s+data-[a-z-]+="[^"]*"/gi, '');

  return html;
}

/**
 * Extract article content from a URL using Cheerio-based extraction.
 * Uses text density scoring to identify main content.
 */
async function extractArticle(url: string): Promise<ArticleContent> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to fetch URL: " + response.status);
    }

    const rawHtml = await response.text();

    // Preprocess to remove scripts, styles, etc. and limit size
    const html = preprocessHtml(rawHtml);

    // Parse with Cheerio
    const $ = cheerio.load(html);

    // Extract metadata
    const publishedTime = extractPublishedTimeFromCheerio($);
    const siteName = $('meta[property="og:site_name"]').attr('content') || null;

    // Try to extract title
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text().trim() || null;

    // Try to extract byline/author
    let byline = $('meta[name="author"]').attr('content') ||
                 $('meta[property="article:author"]').attr('content') ||
                 $('[rel="author"]').first().text().trim() ||
                 $('[class*="author"]').first().text().trim() ||
                 $('[itemprop="author"]').first().text().trim() || null;

    // Remove non-content elements
    $('script, style, noscript, iframe, svg, nav, header, footer, aside, form, button, input, select, textarea').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').remove();
    $('[class*="nav"], [class*="menu"], [class*="sidebar"], [class*="footer"], [class*="header"], [class*="comment"], [class*="share"], [class*="social"], [class*="advertisement"], [class*="ad-"], [id*="nav"], [id*="menu"], [id*="sidebar"], [id*="footer"], [id*="header"], [id*="comment"], [id*="share"], [id*="social"], [id*="advertisement"], [id*="ad-"]').remove();

    // Score content containers
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '[itemprop="articleBody"]',
      '[class*="article-body"]',
      '[class*="article-content"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      '[class*="content-body"]',
      '[class*="story-body"]',
      '.post',
      '.article',
      '.content',
      '#content',
      '#main',
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bestContent: any = null;
    let bestScore = 0;

    for (const selector of contentSelectors) {
      const elem = $(selector).first();
      if (elem.length) {
        const text = elem.text().trim();
        const wordCount = countWords(text);
        const pCount = elem.find('p').length;
        // Score based on word count and paragraph count
        const score = wordCount + (pCount * 50);

        if (score > bestScore) {
          bestScore = score;
          bestContent = elem;
        }
      }
    }

    // Fallback: find the element with most text content
    if (!bestContent || bestScore < 200) {
      $('body *').each((_, el) => {
        const elem = $(el);
        const tagName = el.tagName?.toLowerCase();

        // Skip inline elements and small containers
        if (['span', 'a', 'b', 'i', 'em', 'strong', 'small', 'label'].includes(tagName)) {
          return;
        }

        const text = elem.text().trim();
        const wordCount = countWords(text);
        const pCount = elem.find('p').length;
        const score = wordCount + (pCount * 50);

        if (score > bestScore && wordCount > 100) {
          bestScore = score;
          bestContent = elem;
        }
      });
    }

    if (!bestContent) {
      return {
        content: null,
        textContent: null,
        title,
        byline,
        siteName,
        wordCount: 0,
        readingTime: 0,
        publishedTime,
      };
    }

    // Clean up the content
    bestContent.find('[class*="share"], [class*="social"], [class*="related"], [class*="recommend"]').remove();

    // Extract clean HTML and text
    const contentHtml = bestContent.html() || '';
    const textContent = bestContent.text().trim().replace(/\s+/g, ' ');
    const wordCount = countWords(textContent);

    return {
      content: contentHtml,
      textContent,
      title,
      byline,
      siteName,
      wordCount,
      readingTime: calculateReadingTime(wordCount),
      publishedTime,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[ArticleExtractor] Timeout');
      throw new Error('Request timed out');
    }
    console.error('[ArticleExtractor] Error:', error);
    throw error;
  }
}
