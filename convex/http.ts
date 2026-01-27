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

http.route({
  path: "/api/tweet",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/reddit",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/tiktok",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/pinterest",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/facebook",
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

// =================================================================
// TWEET EMBED ENDPOINT
// =================================================================

http.route({
  path: "/api/tweet",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    try {
      const requestUrl = new URL(request.url);
      const id = requestUrl.searchParams.get("id") || "";

      if (!/^\d{5,40}$/.test(id)) {
        return errorResponse("Invalid tweet id", 400);
      }

      const tweet = await fetchTweetFromSyndication(id);
      if (!tweet) {
        return errorResponse("Tweet not found", 404);
      }

      return jsonResponse({ data: tweet });
    } catch (error) {
      console.error("[Tweet API] Error:", error);
      return errorResponse("Failed to fetch tweet", 500);
    }
  }),
});

// =================================================================
// REDDIT POST ENDPOINT
// =================================================================

http.route({
  path: "/api/reddit",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    try {
      const requestUrl = new URL(request.url);
      const idParam = requestUrl.searchParams.get("id");
      const urlParam = requestUrl.searchParams.get("url");

      const postId = idParam || (urlParam ? extractRedditPostId(urlParam) : null);
      if (!postId) {
        return errorResponse("Invalid reddit id", 400);
      }

      const post = await fetchRedditPost(postId, urlParam || undefined);
      if (!post) {
        if (urlParam) {
          return jsonResponse({ data: buildRedditFallback(postId, urlParam) });
        }
        return errorResponse("Reddit post not found", 404);
      }

      return jsonResponse({ data: post });
    } catch (error) {
      console.error("[Reddit API] Error:", error);
      return errorResponse("Failed to fetch reddit post", 500);
    }
  }),
});

// =================================================================
// TIKTOK OEMBED ENDPOINT
// =================================================================

http.route({
  path: "/api/tiktok",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    try {
      const requestUrl = new URL(request.url);
      const urlParam = requestUrl.searchParams.get("url");

      if (!urlParam) {
        return errorResponse("URL is required", 400);
      }

      const validated = validateExternalUrl(urlParam);
      if (!validated.ok) {
        return errorResponse(validated.error, 400);
      }

      if (!isTikTokUrl(validated.url)) {
        return errorResponse("Not a TikTok URL", 400);
      }

      const data = await fetchTikTokOembed(validated.url);
      if (!data) {
        const fallback = buildTikTokFallback(validated.url);
        if (!fallback) {
          return errorResponse("TikTok oEmbed failed", 404);
        }
        return jsonResponse({ data: fallback });
      }

      return jsonResponse({ data });
    } catch (error) {
      console.error("[TikTok API] Error:", error);
      return errorResponse("Failed to fetch TikTok", 500);
    }
  }),
});

// =================================================================
// PINTEREST RESOLVE ENDPOINT
// =================================================================

http.route({
  path: "/api/pinterest",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    try {
      const requestUrl = new URL(request.url);
      const urlParam = requestUrl.searchParams.get("url");

      if (!urlParam) {
        return errorResponse("URL is required", 400);
      }

      const validated = validateExternalUrl(urlParam);
      if (!validated.ok) {
        return errorResponse(validated.error, 400);
      }

      if (!isPinterestUrl(validated.url)) {
        return errorResponse("Not a Pinterest URL", 400);
      }

      const resolved = await resolvePinterestUrl(validated.url);
      if (!resolved) {
        const fallbackId = extractPinterestPinId(validated.url);
        return jsonResponse({
          data: {
            url: validated.url,
            id: fallbackId,
          },
        });
      }

      return jsonResponse({ data: resolved });
    } catch (error) {
      console.error("[Pinterest API] Error:", error);
      return errorResponse("Failed to resolve Pinterest", 500);
    }
  }),
});

// =================================================================
// FACEBOOK RESOLVE ENDPOINT
// =================================================================

http.route({
  path: "/api/facebook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    try {
      const requestUrl = new URL(request.url);
      const urlParam = requestUrl.searchParams.get("url");

      if (!urlParam) {
        return errorResponse("URL is required", 400);
      }

      const validated = validateExternalUrl(urlParam);
      if (!validated.ok) {
        return errorResponse(validated.error, 400);
      }

      if (!isFacebookUrl(validated.url)) {
        return errorResponse("Not a Facebook URL", 400);
      }

      const resolved = await resolveFacebookUrl(validated.url);
      if (!resolved) {
        return jsonResponse({ data: { url: validated.url } });
      }

      return jsonResponse({ data: resolved });
    } catch (error) {
      console.error("[Facebook API] Error:", error);
      return errorResponse("Failed to resolve Facebook", 500);
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

function isTikTokUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes("tiktok.com");
  } catch {
    return false;
  }
}

function extractPinterestPinId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === "pin.it") return null;
    if (!hostname.includes("pinterest.")) return null;
    const match = urlObj.pathname.match(/\/pin\/([^/?#]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function isPinterestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === "pin.it") return true;
    return hostname.includes("pinterest.") && /\/pin\//.test(urlObj.pathname);
  } catch {
    return false;
  }
}

function isFacebookUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes("facebook.com") || hostname === "fb.watch" || hostname === "fb.com";
  } catch {
    return false;
  }
}

async function resolveFacebookUrl(url: string): Promise<{ url: string } | null> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  try {
    const res = await fetch(url, { redirect: "follow", headers });
    const resolvedUrl = res.url || url;
    return { url: resolvedUrl };
  } catch {
    return null;
  }
}

async function resolvePinterestUrl(url: string): Promise<{ url: string; id?: string | null } | null> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  try {
    const res = await fetch(url, { redirect: "follow", headers });
    const resolvedUrl = res.url || url;
    const id = extractPinterestPinId(resolvedUrl) || extractPinterestPinId(url);

    if (id || resolvedUrl) {
      return { url: resolvedUrl, id };
    }

    return null;
  } catch {
    return null;
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

    const match = urlObj.pathname.match(/\/comments\/([a-z0-9]+)(?:\/|$)/i);
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
      // Digg stores post data in various locations depending on page type
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

        // Use first image as primary
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
            // Extract images from attachments
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

  // Fallback to og:meta tags if __NEXT_DATA__ didn't have what we need
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

  // Try to find images in the HTML if we don't have any yet
  if (images.length === 0) {
    // Look for imgix URLs in the page (Digg's CDN)
    const imgixRegex = /https:\/\/digg-posts-prod[^"'\s]+/g;
    const imgixMatches = html.match(imgixRegex);
    if (imgixMatches) {
      for (const imgUrl of imgixMatches) {
        // Clean up the URL (remove escape characters)
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
    images: [...new Set(images)], // dedupe
    favicon: "https://digg.com/favicon.ico",
    domain: "digg.com",
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
    const post = data?.props?.pageProps?.post || data?.props?.pageProps?.initialPost;
    if (post) {
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
  // Digg: use default scraper for now
  // if (isDiggUrl(url)) {
  //   return scrapeDigg(url);
  // }

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

  // Use og:image if available, otherwise fall back to first extracted image
  const resolvedImage = image ? resolveUrl(image, url) : null;
  let finalImage = resolvedImage || (images.length > 0 ? images[0] : null);

  // For Digg link posts: if no image found, try to get og:image from the linked article
  if (!finalImage && domain.includes('digg.com')) {
    const externalUrl = extractDiggExternalUrl(html);
    if (externalUrl) {
      try {
        const externalImage = await fetchExternalOgImage(externalUrl);
        if (externalImage) {
          finalImage = externalImage;
          images.unshift(externalImage);
        }
      } catch {
        // Failed to fetch external image
      }
    }
  }

  return {
    title,
    description,
    image: finalImage,
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

  // Fallback: Look for imgix URLs in raw HTML (for sites like Digg that store images in JSON data)
  if (images.length === 0) {
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

async function fetchTikTokOembed(url: string): Promise<Record<string, unknown> | null> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  try {
    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
        Accept: "application/json",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function extractTikTokVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/video\/(\d+)/);
    if (match?.[1]) return match[1];
    const itemId = parsed.searchParams.get("item_id");
    return itemId || null;
  } catch {
    return null;
  }
}

function extractTikTokAuthor(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/@([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function buildTikTokFallback(url: string): Record<string, unknown> | null {
  const videoId = extractTikTokVideoId(url);
  if (!videoId) return null;
  const author = extractTikTokAuthor(url);
  return {
    title: "TikTok video",
    author_name: author || undefined,
    provider_name: "TikTok",
    embed_product_id: videoId,
  };
}

interface RedditMediaItem {
  type: "image" | "video";
  url: string;
  width?: number;
  height?: number;
  videoUrl?: string;
  hlsUrl?: string;
}

interface RedditPostData {
  id: string;
  title?: string;
  selftext?: string;
  author?: string;
  subreddit?: string;
  subreddit_name_prefixed?: string;
  created_utc?: number;
  score?: number;
  num_comments?: number;
  permalink?: string;
  url?: string;
  domain?: string;
  media?: RedditMediaItem[];
}

function isRedditImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url);
}

function extractRedditMedia(post: any): RedditMediaItem[] {
  const media: RedditMediaItem[] = [];
  const videoUrl =
    post?.media?.reddit_video?.fallback_url ||
    post?.preview?.reddit_video_preview?.fallback_url ||
    null;
  const hlsUrl =
    post?.media?.reddit_video?.hls_url ||
    post?.preview?.reddit_video_preview?.hls_url ||
    null;

  if (post?.is_gallery && post?.media_metadata) {
    const order =
      post?.gallery_data?.items?.map((item: { media_id: string }) => item.media_id) ||
      Object.keys(post.media_metadata);

    for (const mediaId of order) {
      const item = post.media_metadata?.[mediaId];
      const url = item?.s?.u ? decodeHtmlEntities(item.s.u) : null;
      if (url) {
        media.push({
          type: "image",
          url,
          width: item?.s?.x,
          height: item?.s?.y,
        });
      }
    }
  }

  if (media.length === 0) {
    const preview = post?.preview?.images?.[0]?.source;
    if (preview?.url) {
      media.push({
        type: post?.is_video ? "video" : "image",
        url: decodeHtmlEntities(preview.url),
        width: preview.width,
        height: preview.height,
        videoUrl: post?.is_video ? videoUrl || undefined : undefined,
        hlsUrl: post?.is_video ? hlsUrl || undefined : undefined,
      });
    }
  }

  if (media.length === 0 && typeof post?.url === "string" && isRedditImageUrl(post.url)) {
    media.push({
      type: "image",
      url: post.url,
    });
  }

  if (
    media.length === 0 &&
    post?.is_video &&
    typeof post?.thumbnail === "string" &&
    post.thumbnail.startsWith("http")
  ) {
    media.push({
      type: "video",
      url: post.thumbnail,
      videoUrl: videoUrl || undefined,
      hlsUrl: hlsUrl || undefined,
    });
  }

  return media;
}

function normalizeRedditEmbedUrl(rawUrl: string): string | null {
  try {
    const parsedUrl = new URL(rawUrl);
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function buildRedditFallback(postId: string, rawUrl: string): RedditPostData {
  const normalizedUrl = normalizeRedditEmbedUrl(rawUrl) || rawUrl;
  let subreddit: string | undefined;
  let subreddit_name_prefixed: string | undefined;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const match = parsedUrl.pathname.match(/\/r\/([^/]+)/i);
    if (match?.[1]) {
      subreddit = match[1];
      subreddit_name_prefixed = `r/${match[1]}`;
    }
  } catch {
    // ignore parsing errors
  }

  return {
    id: postId,
    subreddit,
    subreddit_name_prefixed,
    permalink: normalizedUrl,
    url: normalizedUrl,
    domain: "reddit.com",
    media: [],
  };
}

async function fetchRedditOembed(url: string): Promise<RedditPostData | null> {
  const normalizedUrl = normalizeRedditEmbedUrl(url) || url;
  const candidates = [normalizedUrl, url].filter((value, index, array) => array.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://www.reddit.com/oembed?url=${encodeURIComponent(candidate)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
            Accept: "application/json",
          },
          redirect: "follow",
        }
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const parsedUrl = new URL(candidate);
      const subredditMatch = parsedUrl.pathname.match(/\/r\/([^/]+)/i);
      const postIdMatch = parsedUrl.pathname.match(/\/comments\/([a-z0-9]+)/i);
      const postId = postIdMatch?.[1];

      const thumbnail = data?.thumbnail_url || null;
      const media: RedditMediaItem[] = thumbnail
        ? [
            {
              type: "image" as const,
              url: thumbnail,
            },
          ]
        : [];

      return {
        id: postId || "",
        title: data?.title || undefined,
        author: data?.author_name ? data.author_name.replace(/^u\//i, "") : undefined,
        subreddit: subredditMatch?.[1],
        subreddit_name_prefixed: subredditMatch ? `r/${subredditMatch[1]}` : undefined,
        permalink: candidate,
        url: candidate,
        domain: "reddit.com",
        media,
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchRedditPreviewFromHtml(id: string, rawUrl: string): Promise<RedditPostData | null> {
  const normalizedUrl = normalizeRedditEmbedUrl(rawUrl) || rawUrl;
  // Try old.reddit.com which has less strict bot detection
  const oldRedditUrl = normalizedUrl.replace("www.reddit.com", "old.reddit.com");
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
  };

  // Try both old.reddit and www.reddit
  const urlsToTry = [oldRedditUrl, normalizedUrl];

  for (const urlToFetch of urlsToTry) {
    try {
      console.log("[fetchRedditPreviewFromHtml] Fetching:", urlToFetch);
      const response = await fetch(urlToFetch, {
        headers,
        redirect: "follow",
      });
      console.log("[fetchRedditPreviewFromHtml] Response status:", response.status);
      if (!response.ok) continue;

      const html = await response.text();
      console.log("[fetchRedditPreviewFromHtml] HTML length:", html.length);
      const previewMatches = html.match(/https:\/\/preview\.redd\.it\/[^"'\s<>]+/g) || [];
      console.log("[fetchRedditPreviewFromHtml] Preview matches:", previewMatches.length, previewMatches.slice(0, 2));
      const previewUrls = Array.from(
        new Set(previewMatches.map((value) => decodeHtmlEntities(value)))
      ).slice(0, 8);

      if (previewUrls.length === 0) {
        console.log("[fetchRedditPreviewFromHtml] No preview URLs found, trying next URL");
        continue;
      }

      let subreddit: string | undefined;
      let subreddit_name_prefixed: string | undefined;
      try {
        const parsedUrl = new URL(normalizedUrl);
        const match = parsedUrl.pathname.match(/\/r\/([^/]+)/i);
        if (match?.[1]) {
          subreddit = match[1];
          subreddit_name_prefixed = `r/${match[1]}`;
        }
      } catch {
        // ignore parsing errors
      }

      const media: RedditMediaItem[] = previewUrls.map((url) => ({
        type: "image" as const,
        url,
      }));

      console.log("[fetchRedditPreviewFromHtml] Success! Found", media.length, "images");
      return {
        id,
        subreddit,
        subreddit_name_prefixed,
        permalink: normalizedUrl,
        url: normalizedUrl,
        domain: "reddit.com",
        media,
      };
    } catch (e) {
      console.log("[fetchRedditPreviewFromHtml] Error fetching:", e);
      continue;
    }
  }

  console.log("[fetchRedditPreviewFromHtml] All URLs failed");
  return null;
}

async function fetchRedditPost(id: string, url?: string): Promise<RedditPostData | null> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const fetchPostData = async (url: string, selector: (data: any) => any) => {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return selector(data);
  };

  const post =
    (await fetchPostData(
      `https://www.reddit.com/comments/${id}.json?raw_json=1`,
      (data) => data?.[0]?.data?.children?.[0]?.data
    )) ||
    (await fetchPostData(
      `https://www.reddit.com/by_id/t3_${id}.json?raw_json=1`,
      (data) => data?.data?.children?.[0]?.data
    )) ||
    (await fetchPostData(
      `https://api.reddit.com/api/info/?id=t3_${id}`,
      (data) => data?.data?.children?.[0]?.data
    ));

  if (!post) {
    if (url) {
      const oembed = await fetchRedditOembed(url);
      if (oembed?.media?.length) {
        return oembed;
      }
      const htmlPreview = await fetchRedditPreviewFromHtml(id, url);
      return htmlPreview || oembed;
    }
    return null;
  }

  const media = extractRedditMedia(post);
  const permalink = post?.permalink ? `https://www.reddit.com${post.permalink}` : undefined;

  return {
    id: post?.id || id,
    title: post?.title,
    selftext: post?.selftext,
    author: post?.author,
    subreddit: post?.subreddit,
    subreddit_name_prefixed: post?.subreddit_name_prefixed,
    created_utc: post?.created_utc,
    score: post?.score,
    num_comments: post?.num_comments,
    permalink,
    url: post?.url,
    domain: post?.domain,
    media,
  };
}

const TWEET_FEATURES = [
  "tfw_timeline_list:",
  "tfw_follower_count_sunset:true",
  "tfw_tweet_edit_backend:on",
  "tfw_refsrc_session:on",
  "tfw_fosnr_soft_interventions_enabled:on",
  "tfw_show_birdwatch_pivots_enabled:on",
  "tfw_show_business_verified_badge:on",
  "tfw_duplicate_scribes_to_settings:on",
  "tfw_use_profile_image_shape_enabled:on",
  "tfw_show_blue_verified_badge:on",
  "tfw_legacy_timeline_sunset:true",
  "tfw_show_gov_verified_badge:on",
  "tfw_show_business_affiliate_badge:on",
  "tfw_tweet_edit_frontend:on",
].join(";");

function getTweetToken(id: string): string {
  return (Number(id) / 1e15 * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

async function fetchTweetFromSyndication(id: string): Promise<unknown | null> {
  const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
  url.searchParams.set("id", id);
  url.searchParams.set("lang", "en");
  url.searchParams.set("features", TWEET_FEATURES);
  url.searchParams.set("token", getTweetToken(id));

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "application/json",
    },
    redirect: "follow",
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (response.ok) {
    if (data && typeof data === "object" && Object.keys(data).length === 0) {
      return null;
    }
    if (data?.__typename === "TweetTombstone") {
      return null;
    }
    return data;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(`Tweet fetch failed: ${response.status}`);
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
