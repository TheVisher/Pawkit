import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Add auth routes
auth.addHttpRoutes(http);

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
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const validated = validateExternalUrl(url);
      if (!validated.ok) {
        return new Response(JSON.stringify({ error: validated.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Scrape metadata
      const metadata = await scrapeUrl(validated.url);

      return new Response(JSON.stringify(metadata), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Metadata API] Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch metadata" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
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
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const validated = validateExternalUrl(url);
      if (!validated.ok) {
        return new Response(JSON.stringify({ error: validated.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Extract article
      const article = await extractArticle(validated.url);

      return new Response(
        JSON.stringify({ success: true, article }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[Article API] Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to extract article" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
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
          return new Response(JSON.stringify({ error: validated.error }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = await checkLink(validated.url);
        return new Response(JSON.stringify({ url, ...result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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
          return new Response(
            JSON.stringify({ error: "No valid URLs provided" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const results: Record<string, unknown> = {};
        for (const checkUrl of urlsToCheck) {
          results[checkUrl] = await checkLink(checkUrl);
        }

        return new Response(
          JSON.stringify({
            results,
            checked: urlsToCheck.length,
            truncated: urls.length > MAX_BATCH,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Either url or urls parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[Link Check API] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
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

async function scrapeUrl(url: string): Promise<ScrapedMetadata> {
  if (isYouTubeUrl(url)) {
    return scrapeYouTube(url);
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
  wordCount: number;
  readingTime: number;
}

async function extractArticle(url: string): Promise<ArticleContent> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch URL: " + response.status);
  }

  const html = await response.text();
  let content = extractMainContent(html);

  if (!content) {
    return { content: null, wordCount: 0, readingTime: 0 };
  }

  content = cleanHtml(content);

  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return { content, wordCount, readingTime };
}

function extractMainContent(html: string): string | null {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  const contentMatch = html.match(
    /<div[^>]*(?:class|id)=["'][^"']*(?:content|article|post)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (contentMatch) return contentMatch[1];

  return null;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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
