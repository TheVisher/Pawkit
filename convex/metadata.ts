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
    if (!shouldExtractArticle(card.url)) return;
    if (card.articleContent || card.articleContentEdited) return;

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

function isNyTimesUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname === "nytimes.com" || hostname.endsWith(".nytimes.com");
  } catch {
    return false;
  }
}

function isWikipediaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.endsWith(".wikipedia.org");
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

/**
 * Check if URL is an IMDb URL.
 */
function isImdbUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname === "imdb.com" || hostname.endsWith(".imdb.com");
  } catch {
    return false;
  }
}

function isDiggUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname === "digg.com" || hostname.endsWith(".digg.com");
  } catch {
    return false;
  }
}

/**
 * Check if a URL is likely to have readable article content.
 */
function shouldExtractArticle(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (isYouTubeUrl(url) || isImdbUrl(url)) {
      return false;
    }

    const nonArticleDomains = [
      "twitter.com",
      "x.com",
      "instagram.com",
      "facebook.com",
      "tiktok.com",
      "reddit.com",
      "redd.it",
      "maps.google.com",
      "drive.google.com",
      "docs.google.com",
      "sheets.google.com",
      "calendar.google.com",
    ];

    if (nonArticleDomains.some(d => hostname === d || hostname.endsWith("." + d))) {
      return false;
    }

    const nonArticleExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".ico",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".mp3",
      ".mp4",
      ".wav",
      ".avi",
      ".mov",
      ".webm",
      ".zip",
      ".rar",
      ".tar",
      ".gz",
      ".js",
      ".css",
      ".json",
      ".xml",
    ];

    if (nonArticleExtensions.some(ext => path.endsWith(ext))) {
      return false;
    }

    const nonArticlePatterns = [
      /^\/api\//,
      /^\/static\//,
      /^\/assets\//,
      /^\/cdn-cgi\//,
      /\/feed\/?$/,
      /\/rss\/?$/,
      /^\/cart/,
      /^\/checkout/,
      /^\/account/,
      /^\/login/,
      /^\/signin/,
      /^\/signup/,
      /^\/search/,
      /^\/s\?/,
      /^\/pl\//,
      /^\/dp\//,
      /^\/gp\//,
      /^\/ip\//,
    ];

    if (nonArticlePatterns.some(pattern => pattern.test(path))) {
      return false;
    }

    return true;
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

function extractWikipediaTitle(url: string): { host: string; title: string } | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/wiki\/(.+)/i);
    if (!match?.[1]) return null;
    return { host: urlObj.host, title: decodeURIComponent(match[1]) };
  } catch {
    return null;
  }
}

/**
 * Extract IMDb title ID (tt1234567) from URL.
 */
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
 * Fetch Reddit metadata using the public JSON endpoint.
 * Note: Reddit often blocks server-side requests with 403.
 * When this happens, we return minimal metadata and let the
 * client-side RedditPreview component fetch the actual data.
 */
async function scrapeReddit(url: string): Promise<ScrapedMetadata> {
  const postId = extractRedditPostId(url);
  if (!postId) {
    throw new Error("Invalid Reddit URL");
  }

  // Minimal fallback metadata for when Reddit blocks us
  const fallbackMetadata: ScrapedMetadata = {
    title: null,
    description: null,
    image: null,
    images: [],
    favicon: "https://www.reddit.com/favicon.ico",
    domain: "reddit.com",
    raw: {
      redditPostId: postId,
      source: "reddit-fallback",
      clientFetchRequired: true,
    },
  };

  try {
    const apiUrl = `https://www.reddit.com/comments/${postId}.json?raw_json=1`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
        Accept: "application/json",
      },
      redirect: "follow",
    });

    // Reddit often blocks server-side requests with 403
    // Return fallback metadata instead of throwing
    if (!response.ok) {
      console.log("[scrapeReddit] Reddit returned " + response.status + ", using fallback metadata");
      return fallbackMetadata;
    }

    const data = await response.json();
    const post = data?.[0]?.data?.children?.[0]?.data;
    if (!post) {
      console.log("[scrapeReddit] No post data found, using fallback metadata");
      return fallbackMetadata;
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
      raw: {
        reddit: post,
        source: "reddit-json",
      },
    };
  } catch (error) {
    // Network errors, timeouts, etc. - use fallback
    console.log("[scrapeReddit] Error fetching Reddit data:", error);
    return fallbackMetadata;
  }
}

/**
 * Fetch NYTimes metadata using the oEmbed endpoint.
 */
async function scrapeNyTimes(url: string): Promise<ScrapedMetadata> {
  const oembedUrl = `https://www.nytimes.com/svc/oembed/json/?url=${encodeURIComponent(url)}`;
  const response = await fetch(oembedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
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
          "User-Agent":
            "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
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
    raw: {
      nytimes: data,
      source: "nytimes-oembed",
    },
  };
}

/**
 * Fetch IMDb metadata using the public suggestion endpoint.
 */
async function scrapeImdb(url: string): Promise<ScrapedMetadata> {
  const titleId = extractImdbTitleId(url);
  if (!titleId) {
    throw new Error("Invalid IMDb URL");
  }

  const suggestionUrl = `https://v2.sg.media-imdb.com/suggestion/${titleId[0]}/${titleId}.json`;
  const response = await fetch(suggestionUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
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
    raw: {
      imdb: entry,
      source: "imdb-suggestion",
    },
  };
}

/**
 * Fetch Digg post metadata by parsing __NEXT_DATA__.
 */
async function scrapeDigg(url: string): Promise<ScrapedMetadata> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Digg page: " + response.status);
  }

  const html = await response.text();

  // Extract __NEXT_DATA__ JSON from the page
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);

  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  const images: string[] = [];

  if (nextDataMatch?.[1]) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);

      // Navigate through Next.js data structure to find post data
      const pageProps = nextData?.props?.pageProps;
      const post = pageProps?.post || pageProps?.initialPost;

      if (post) {
        title = post.title || null;
        description = post.body || post.text || null;
        if (description && description.length > 300) {
          description = description.slice(0, 300) + "...";
        }

        // Extract images from attachments array
        const attachments = post.attachments || [];
        for (const attachment of attachments) {
          if (attachment?.url) {
            images.push(attachment.url);
          }
        }

        // Also check for direct image URL
        if (post.image?.url) {
          images.unshift(post.image.url);
        }
        if (post.imageUrl) {
          images.unshift(post.imageUrl);
        }

        if (images.length > 0) {
          image = images[0];
        }
      }

      // Also check dehydratedState for post data (React Query cache)
      const dehydratedState = pageProps?.dehydratedState;
      if (dehydratedState?.queries) {
        for (const query of dehydratedState.queries) {
          const data = query?.state?.data;
          if (data?.post || data?.item) {
            const postData = data.post || data.item;
            if (!title && postData?.title) {
              title = postData.title;
            }
            if (!description && (postData?.body || postData?.text)) {
              description = (postData.body || postData.text)?.slice(0, 300);
            }
            const atts = postData?.attachments || [];
            for (const att of atts) {
              if (att?.url && !images.includes(att.url)) {
                images.push(att.url);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse Digg __NEXT_DATA__:", e);
    }
  }

  // Fallback to og:meta tags
  if (!title) {
    title = extractMetaContent(html, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      "title",
    ]);
  }

  if (!description) {
    description = extractMetaContent(html, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]);
  }

  // Look for imgix URLs if we don't have images yet
  if (images.length === 0) {
    const imgixRegex = /https:\/\/digg-posts-prod[^"'\s]+/g;
    const imgixMatches = html.match(imgixRegex);
    if (imgixMatches) {
      for (const imgUrl of imgixMatches) {
        const cleanUrl = imgUrl.replace(/\\u002F/g, '/').replace(/\\/g, '');
        if (!images.includes(cleanUrl) && images.length < 10) {
          images.push(cleanUrl);
        }
      }
    }
  }

  if (!image && images.length > 0) {
    image = images[0];
  }

  return {
    title,
    description,
    image,
    images: [...new Set(images)],
    favicon: "https://digg.com/favicon.ico",
    domain: "digg.com",
    raw: {
      source: "digg-nextdata",
    },
  };
}

/**
 * Extract external article URL from Digg's __NEXT_DATA__ for link posts.
 */
function extractDiggExternalUrl(html: string): string | null {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
  if (!nextDataMatch) return null;

  try {
    const data = JSON.parse(nextDataMatch[1]);
    // Try to find the external URL in various possible locations
    const post = data?.props?.pageProps?.post || data?.props?.pageProps?.initialPost;
    if (post) {
      // Check for external link URL
      const externalUrl = post.url || post.externalUrl || post.link;
      if (externalUrl && !externalUrl.includes('digg.com')) {
        return externalUrl;
      }
    }
  } catch {
    // JSON parse failed
  }

  // Fallback: try to find external URLs in the raw JSON string
  const urlMatch = nextDataMatch[1].match(/"url"\s*:\s*"(https?:\/\/(?!digg\.com)[^"]+)"/);
  if (urlMatch) {
    return urlMatch[1].replace(/\\u002F/g, '/');
  }

  return null;
}

/**
 * Fetch og:image from an external URL.
 */
async function fetchExternalOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) return null;

    const html = await response.text();
    const ogImage = extractMetaContent(html, [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]);

    if (ogImage) {
      return resolveUrl(ogImage, url);
    }
  } catch {
    // Fetch failed
  }

  return null;
}

/**
 * Scrape metadata from a URL.
 */
async function scrapeUrl(url: string): Promise<ScrapedMetadata> {
  // Handle YouTube URLs specially (oEmbed + thumbnail generation)
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
  // Digg: use default scraper for now
  // if (isDiggUrl(url)) {
  //   return scrapeDigg(url);
  // }

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

  // Use og:image if available, otherwise fall back to first extracted image
  const resolvedImage = image ? resolveUrl(image, url) : null;
  let finalImage = resolvedImage || (images.length > 0 ? images[0] : null);

  // For Digg link posts: if no image found, try to get og:image from the linked article
  if (!finalImage && domain.includes('digg.com')) {
    const externalUrl = extractDiggExternalUrl(html);
    if (externalUrl) {
      console.log("[scrapeUrl] Digg link post detected, fetching external article:", externalUrl);
      try {
        const externalImage = await fetchExternalOgImage(externalUrl);
        if (externalImage) {
          finalImage = externalImage;
          images.unshift(externalImage);
          console.log("[scrapeUrl] Got image from external article:", externalImage.slice(0, 80));
        }
      } catch (e) {
        console.log("[scrapeUrl] Failed to fetch external article image:", e);
      }
    }
  }

  console.log("[scrapeUrl] Results for", url, {
    title: title?.slice(0, 50),
    ogImage: image?.slice(0, 100),
    finalImage: finalImage?.slice(0, 100),
    imagesCount: images.length,
    firstImages: images.slice(0, 3).map(i => i.slice(0, 80)),
  });

  return {
    title,
    description,
    image: finalImage,
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
    let src = match[1];
    if (src && !src.startsWith("data:")) {
      // Check if this is a Next.js image proxy URL - extract the actual URL
      // Handle both relative (/_next/image) and absolute (https://example.com/_next/image) URLs
      const nextImageMatch = src.match(/_next\/image\?url=([^&]+)/);
      if (nextImageMatch) {
        try {
          const decodedUrl = decodeURIComponent(nextImageMatch[1]);
          // Skip community icons and static assets
          if (decodedUrl.includes('/communities/') ||
              decodedUrl.includes('/static/') ||
              decodedUrl.includes('/icons/')) {
            continue;
          }
          src = decodedUrl;
        } catch {
          // If decode fails, skip this URL entirely (it's a proxy URL that will CORS fail)
          continue;
        }
      }
      const resolved = resolveUrl(src, baseUrl);
      if (resolved && !seen.has(resolved)) {
        images.push(resolved);
        seen.add(resolved);
      }
    }
  }

  // Fallback: Look for imgix URLs in raw HTML (for sites like Digg that store images in JSON)
  // Only do this if we haven't found any images yet
  if (images.length === 0) {
    console.log("[extractImages] No og:image or img tags found, trying imgix fallback");
    // First, look for _next/image URLs and extract the actual image URL from the url param
    const nextImagePattern = /\/_next\/image\?url=([^&"'\s]+)/gi;
    let nextMatch;
    while ((nextMatch = nextImagePattern.exec(html)) !== null && images.length < 10) {
      try {
        const decodedUrl = decodeURIComponent(nextMatch[1]);
        // Only include post images, not community icons or static assets
        const isPostImage = decodedUrl.includes('imgix.net') &&
          !decodedUrl.includes('/communities/') &&
          !decodedUrl.includes('/static/') &&
          !decodedUrl.includes('/icons/');
        if (isPostImage && !seen.has(decodedUrl)) {
          images.push(decodedUrl);
          seen.add(decodedUrl);
        }
      } catch {
        // Ignore decode errors
      }
    }

    // Also try direct imgix URLs (JSON-escaped or not)
    if (images.length === 0) {
      const imgixPattern = /https:\\?\/\\?\/[a-z0-9-]+\.imgix\.net(?:\\?\/[^"'\s]+)+/gi;
      const imgixMatches = html.match(imgixPattern);
      if (imgixMatches) {
        for (const match of imgixMatches.slice(0, 10)) {
          let imgUrl = match.replace(/\\\//g, '/');
          // Exclude community icons and static assets
          const isPostImage = !imgUrl.includes('/communities/') &&
            !imgUrl.includes('/static/') &&
            !imgUrl.includes('/icons/');
          if (isPostImage && !seen.has(imgUrl)) {
            images.push(imgUrl);
            seen.add(imgUrl);
          }
        }
      }
    }
  }

  // For Digg: prioritize post images (digg-posts-prod) over profile pictures (digg-accounts-prod)
  if (images.some(img => img.includes('digg-posts-prod')) && images.some(img => img.includes('digg-accounts-prod'))) {
    images.sort((a, b) => {
      const aIsPost = a.includes('digg-posts-prod') ? 0 : 1;
      const bIsPost = b.includes('digg-posts-prod') ? 0 : 1;
      return aIsPost - bIsPost;
    });
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLimitedHtml($: cheerio.CheerioAPI, root: any, maxChars: number): string {
  const pieces: string[] = [];
  let total = 0;
  const children = root.children().toArray();

  for (const child of children) {
    const html = $.html(child) || "";
    if (!html) continue;
    if (total + html.length > maxChars) break;
    pieces.push(html);
    total += html.length;
  }

  return pieces.join("");
}

async function extractWikipediaArticle(url: string): Promise<ArticleContent> {
  const target = extractWikipediaTitle(url);
  if (!target) {
    throw new Error("Invalid Wikipedia URL");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const apiUrl = `https://${target.host}/api/rest_v1/page/html/${encodeURIComponent(target.title)}`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to fetch Wikipedia article: " + response.status);
    }

    const rawHtml = await response.text();
    const html = preprocessHtml(rawHtml);
    const $ = cheerio.load(html);

    const title =
      $("title").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      null;

    const siteName = "Wikipedia";
    const publishedTime =
      $('meta[property="dc:modified"]').attr("content") ||
      $('meta[property="dc:modified"]').attr("content") ||
      null;

    const body = $("body").first();
    if (!body.length) {
      return {
        content: null,
        textContent: null,
        title,
        byline: null,
        siteName,
        wordCount: 0,
        readingTime: 0,
        publishedTime,
      };
    }

    // Remove common non-content elements
    body.find("script, style, noscript, svg, nav, header, footer, aside").remove();
    body.find(".toc, .mw-editsection, .reflist, .reference, .navbox, .metadata, .ambox, .shortdescription").remove();
    body.find("sup.reference").remove();

    const contentHtml = buildLimitedHtml($, body, 650000);
    const textContent = cheerio.load(`<div>${contentHtml}</div>`)("div").text().trim().replace(/\s+/g, " ");
    const wordCount = countWords(textContent);

    return {
      content: contentHtml,
      textContent,
      title,
      byline: null,
      siteName,
      wordCount,
      readingTime: calculateReadingTime(wordCount),
      publishedTime,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[ArticleExtractor] Wikipedia timeout");
      throw new Error("Request timed out");
    }
    console.error("[ArticleExtractor] Wikipedia error:", error);
    throw error;
  }
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
 * Extract Digg post content from __NEXT_DATA__.
 */
async function extractDiggArticle(url: string): Promise<ArticleContent> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to fetch Digg page: " + response.status);
    }

    const html = await response.text();

    // Extract __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);

    let title: string | null = null;
    let content: string | null = null;
    let textContent: string | null = null;
    let byline: string | null = null;
    const images: string[] = [];

    if (nextDataMatch?.[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        const post = pageProps?.post || pageProps?.initialPost;

        if (post) {
          title = post.title || null;
          textContent = post.body || post.text || null;
          byline = post.author?.username || post.authorUsername || null;

          // Extract images from attachments
          const attachments = post.attachments || [];
          for (const attachment of attachments) {
            if (attachment?.url) {
              images.push(attachment.url);
            }
          }
          if (post.image?.url) images.unshift(post.image.url);
          if (post.imageUrl) images.unshift(post.imageUrl);

          // Build HTML content with images and text
          const contentParts: string[] = [];

          // Add images
          for (const imgUrl of images) {
            contentParts.push(`<img src="${imgUrl}" alt="" />`);
          }

          // Add text content
          if (textContent) {
            // Convert line breaks to paragraphs
            const paragraphs = textContent.split(/\n\n+/).filter(p => p.trim());
            for (const p of paragraphs) {
              contentParts.push(`<p>${p.replace(/\n/g, '<br/>')}</p>`);
            }
          }

          content = contentParts.join('\n');
        }

        // Also check dehydratedState
        const dehydratedState = pageProps?.dehydratedState;
        if (dehydratedState?.queries && !content) {
          for (const query of dehydratedState.queries) {
            const data = query?.state?.data;
            if (data?.post || data?.item) {
              const postData = data.post || data.item;
              if (!title) title = postData?.title || null;
              if (!textContent) textContent = postData?.body || postData?.text || null;
              if (!byline) byline = postData?.author?.username || null;

              const atts = postData?.attachments || [];
              for (const att of atts) {
                if (att?.url && !images.includes(att.url)) {
                  images.push(att.url);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse Digg __NEXT_DATA__:", e);
      }
    }

    // Fallback to og:meta for title
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      title = ogTitleMatch?.[1] || null;
    }

    const wordCount = countWords(textContent || '');

    return {
      content,
      textContent,
      title,
      byline,
      siteName: "Digg",
      wordCount,
      readingTime: calculateReadingTime(wordCount),
      publishedTime: null,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  }
}

/**
 * Extract article content from a URL using Cheerio-based extraction.
 * Uses text density scoring to identify main content.
 */
async function extractArticle(url: string): Promise<ArticleContent> {
  if (isWikipediaUrl(url)) {
    return extractWikipediaArticle(url);
  }
  // Digg: use default extractor for now
  // if (isDiggUrl(url)) {
  //   return extractDiggArticle(url);
  // }

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
