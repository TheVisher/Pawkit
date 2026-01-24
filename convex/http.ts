import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import * as cheerio from "cheerio";

const http = httpRouter();

// Add auth routes
auth.addHttpRoutes(http);

// =================================================================
// CORS HELPERS
// =================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

// OPTIONS preflight handler for all API routes
http.route({
  path: "/api/metadata",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/article",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/link-check",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// =================================================================
// METADATA SCRAPING HTTP ENDPOINT
// =================================================================

http.route({
  path: "/api/metadata",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url } = body as { url?: string };

      if (!url || typeof url !== "string") {
        return errorResponse("URL is required");
      }

      const validated = validateExternalUrl(url);
      if (!validated.ok) {
        return errorResponse(validated.error);
      }

      // Scrape metadata
      const metadata = await scrapeUrl(validated.url);

      return jsonResponse(metadata);
    } catch (error) {
      console.error("[Metadata API] Error:", error);
      return errorResponse("Failed to fetch metadata", 500);
    }
  }),
});

// =================================================================
// ARTICLE EXTRACTION HTTP ENDPOINT
// =================================================================

http.route({
  path: "/api/article",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url } = body as { url?: string };

      if (!url || typeof url !== "string") {
        return errorResponse("URL is required");
      }

      const validated = validateExternalUrl(url);
      if (!validated.ok) {
        return errorResponse(validated.error);
      }

      // Extract article
      const article = await extractArticle(validated.url);

      return jsonResponse({ success: true, article });
    } catch (error) {
      console.error("[Article API] Error:", error);
      return errorResponse("Failed to extract article", 500);
    }
  }),
});

// =================================================================
// LINK CHECK HTTP ENDPOINT
// =================================================================

http.route({
  path: "/api/link-check",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url, urls } = body as { url?: string; urls?: string[] };

      // Single URL check
      if (url && typeof url === "string") {
        const validated = validateExternalUrl(url);
        if (!validated.ok) {
          return errorResponse(validated.error);
        }

        const result = await checkLink(validated.url);
        return jsonResponse({ url, ...result });
      }

      // Batch URL check
      if (urls && Array.isArray(urls)) {
        const MAX_BATCH = 20;
        const urlsToCheck = urls
          .slice(0, MAX_BATCH)
          .filter((u): u is string => typeof u === "string")
          .map((u) => {
            const validated = validateExternalUrl(u);
            return validated.ok ? validated.url : null;
          })
          .filter((u): u is string => Boolean(u));

        if (urlsToCheck.length === 0) {
          return errorResponse("No valid URLs provided");
        }

        const results: Record<string, unknown> = {};
        for (const checkUrl of urlsToCheck) {
          results[checkUrl] = await checkLink(checkUrl);
        }

        return jsonResponse({
          results,
          checked: urlsToCheck.length,
          truncated: urls.length > MAX_BATCH,
        });
      }

      return errorResponse("Either url or urls parameter is required");
    } catch (error) {
      console.error("[Link Check API] Error:", error);
      return errorResponse("Internal server error", 500);
    }
  }),
});

export default http;

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
}

function validateExternalUrl(input: string):
  | { ok: true; url: string }
  | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Unsupported URL protocol" };
  }

  const host = parsed.hostname.toLowerCase();

  if (host.endsWith(".local")) {
    return { ok: false, error: "Local URLs are not allowed" };
  }

  if (isPrivateHost(host)) {
    return { ok: false, error: "Private network URLs are not allowed" };
  }

  return { ok: true, url: parsed.toString() };
}

function isPrivateHost(host: string): boolean {
  if (host === "localhost") return true;
  if (host === "::1") return true;

  // IPv4 checks
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;

    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  // IPv6 unique-local, link-local
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80")) return true;

  return false;
}

function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes("youtube.com") || hostname === "youtu.be";
  } catch {
    return false;
  }
}

function isNyTimesUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname === "nytimes.com" || hostname.endsWith(".nytimes.com");
  } catch {
    return false;
  }
}

function isRedditUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return (
      hostname === "reddit.com" ||
      hostname.endsWith(".reddit.com") ||
      hostname === "redd.it"
    );
  } catch {
    return false;
  }
}

function isImdbUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname === "imdb.com" || hostname.endsWith(".imdb.com");
  } catch {
    return false;
  }
}

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

function extractImdbTitleId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/title\/(tt\d{5,})/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function extractRedditPostId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname === "redd.it") {
      const shortId = urlObj.pathname.replace("/", "").split("/")[0];
      return shortId || null;
    }

    const match = urlObj.pathname.match(/\/comments\/([a-z0-9]+)\//i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

async function scrapeYouTube(url: string): Promise<ScrapedMetadata> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

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
    // oEmbed failed
  }

  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    title: title || `YouTube Video - ${videoId}`,
    description: author ? `by ${author}` : null,
    image: thumbnailUrl,
    images: [thumbnailUrl],
    favicon: "https://www.youtube.com/favicon.ico",
    domain: "youtube.com",
  };
}

async function scrapeReddit(url: string): Promise<ScrapedMetadata> {
  const postId = extractRedditPostId(url);
  if (!postId) {
    throw new Error("Invalid Reddit URL");
  }

  const apiUrl = `https://www.reddit.com/comments/${postId}.json?raw_json=1`;
  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "application/json",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Reddit JSON: " + response.status);
  }

  const data = await response.json();
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) {
    throw new Error("Reddit metadata not found");
  }

  const title: string | null = post?.title || null;
  const selftext: string | null = post?.selftext || null;
  const description =
    selftext && selftext.trim().length > 0
      ? selftext.trim().slice(0, 300)
      : null;

  let image: string | null = null;
  const previewUrl = post?.preview?.images?.[0]?.source?.url;
  if (previewUrl) {
    image = decodeHtmlEntities(previewUrl);
  } else if (typeof post?.thumbnail === "string" && post.thumbnail.startsWith("http")) {
    image = post.thumbnail;
  }

  return {
    title,
    description,
    image,
    images: image ? [image] : [],
    favicon: "https://www.reddit.com/favicon.ico",
    domain: "reddit.com",
  };
}

async function scrapeNyTimes(url: string): Promise<ScrapedMetadata> {
  const oembedUrl = `https://www.nytimes.com/svc/oembed/json/?url=${encodeURIComponent(url)}`;
  const response = await fetch(oembedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "application/json",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch NYTimes oEmbed: " + response.status);
  }

  const data = await response.json();
  if (data?.status && data.status !== "ok") {
    throw new Error("NYTimes oEmbed error: " + data.status);
  }

  let image: string | null = data?.thumbnail_url || null;

  if (!image) {
    try {
      const oembedHtmlUrl = `https://www.nytimes.com/svc/oembed/html/?url=${encodeURIComponent(url)}`;
      const htmlResponse = await fetch(oembedHtmlUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
          Accept: "text/html",
        },
        redirect: "follow",
      });
      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        const match = html.match(/<img[^>]*src=["']([^"']+)["']/i);
        if (match?.[1]) {
          image = match[1];
        }
      }
    } catch {
      // Ignore image extraction failures
    }
  }

  if (image) {
    image = resolveUrl(image, url);
  }

  return {
    title: data?.title || null,
    description: data?.summary || null,
    image,
    images: image ? [image] : [],
    favicon: "https://www.nytimes.com/favicon.ico",
    domain: "nytimes.com",
  };
}

async function scrapeImdb(url: string): Promise<ScrapedMetadata> {
  const titleId = extractImdbTitleId(url);
  if (!titleId) {
    throw new Error("Invalid IMDb URL");
  }

  const suggestionUrl = `https://v2.sg.media-imdb.com/suggestion/${titleId[0]}/${titleId}.json`;
  const response = await fetch(suggestionUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "application/json",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch IMDb metadata: " + response.status);
  }

  const data = await response.json();
  const items = Array.isArray(data?.d) ? data.d : [];
  const entry = items.find(
    (item: { id?: string }) =>
      item?.id === titleId ||
      item?.id === `/title/${titleId}/` ||
      item?.id === `/title/${titleId}` ||
      (typeof item?.id === "string" && item.id.includes(titleId))
  );

  if (!entry) {
    throw new Error("IMDb metadata not found for " + titleId);
  }

  const image = entry?.i?.imageUrl || null;
  const descriptionParts: string[] = [];
  if (entry?.y) descriptionParts.push(String(entry.y));
  if (entry?.q) descriptionParts.push(String(entry.q));
  if (entry?.s) descriptionParts.push(String(entry.s));

  return {
    title: entry?.l || `IMDb ${titleId}`,
    description: descriptionParts.length ? descriptionParts.join(" • ") : null,
    image,
    images: image ? [image] : [],
    favicon: "https://www.imdb.com/favicon.ico",
    domain: "imdb.com",
  };
}

async function scrapeUrl(url: string): Promise<ScrapedMetadata> {
  if (isYouTubeUrl(url)) {
    return scrapeYouTube(url);
  }
  if (isRedditUrl(url)) {
    return scrapeReddit(url);
  }
  if (isNyTimesUrl(url)) {
    return scrapeNyTimes(url);
  }
  if (isImdbUrl(url)) {
    return scrapeImdb(url);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch URL: " + response.status);
  }

  const html = await response.text();
  const domain = new URL(url).hostname;

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
  ]);

  const favicon = extractFavicon(html, url);
  const images = extractImages(html, url);

  return {
    title,
    description,
    image: image ? resolveUrl(image, url) : null,
    images,
    favicon,
    domain,
  };
}

function extractMetaContent(html: string, selectors: string[]): string | null {
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

function extractFavicon(html: string, baseUrl: string): string | null {
  const patterns = [
    /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return resolveUrl(match[1], baseUrl);
    }
  }

  try {
    const parsedUrl = new URL(baseUrl);
    return parsedUrl.protocol + "//" + parsedUrl.host + "/favicon.ico";
  } catch {
    return null;
  }
}

function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const ogImage = extractMetaContent(html, ['meta[property="og:image"]']);
  if (ogImage) {
    const resolved = resolveUrl(ogImage, baseUrl);
    if (resolved && !seen.has(resolved)) {
      images.push(resolved);
      seen.add(resolved);
    }
  }

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

function resolveUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

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
 * Extract article content using Cheerio with text density scoring.
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
      throw new Error('Request timed out');
    }
    throw error;
  }
}

interface LinkCheckResult {
  status: "ok" | "broken" | "redirected" | "error";
  redirectUrl?: string;
}

async function checkLink(url: string): Promise<LinkCheckResult> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pawkit LinkChecker/1.0; +https://pawkit.app)",
      },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        const absoluteUrl = new URL(redirectUrl, url).href;
        return { status: "redirected", redirectUrl: absoluteUrl };
      }
    }

    if (response.ok) {
      return { status: "ok" };
    }

    if (response.status >= 400) {
      return { status: "broken" };
    }

    return { status: "ok" };
  } catch {
    return { status: "broken" };
  }
}
