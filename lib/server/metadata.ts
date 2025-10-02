import { parse } from "node-html-parser";

export type SitePreview = {
  title?: string;
  description?: string;
  image?: string;
  logo?: string;
  screenshot?: string;
  raw?: Record<string, unknown>;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const SCREENSHOT_ENDPOINT = (url: string) =>
  `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=675&zoom=1`;
const LOGO_ENDPOINT = (url: string) =>
  `https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(url)}`;

const HERO_META_KEYS = [
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
  "twitter:image:url",
  "itemprop:image"
];

const TITLE_META_KEYS = ["og:title", "twitter:title", "itemprop:name", "title"];
const DESCRIPTION_META_KEYS = ["og:description", "description", "twitter:description", "itemprop:description"];

export async function fetchPreviewMetadata(url: string, previewServiceUrl?: string): Promise<SitePreview | undefined> {
  const results: SitePreview[] = [];

  if (previewServiceUrl) {
    const remote = await fetchRemotePreview(url, previewServiceUrl).catch(() => undefined);
    if (remote) {
      results.push(remote);
    }
  }

  const scraped = await scrapeSiteMetadata(url).catch(() => undefined);
  if (scraped) {
    results.push(scraped);
  }

  if (!results.length) {
    return undefined;
  }

  return mergeMetadata(results, url);
}

async function fetchRemotePreview(url: string, template: string): Promise<SitePreview | undefined> {
  const target = buildPreviewUrl(template, url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(target, {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`preview service returned ${response.status}`);
    }
    const payload = await response.json();
    return normaliseRemotePreview(payload, url);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function scrapeSiteMetadata(url: string): Promise<SitePreview | undefined> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`metadata request failed with ${response.status}`);
    }
    const html = await response.text();
    const root = parse(html);

    const metaTags = root.querySelectorAll("meta");
    const metaMap: Record<string, string> = {};
    for (const tag of metaTags) {
      const property = tag.getAttribute("property") || tag.getAttribute("name") || tag.getAttribute("itemprop");
      if (!property) continue;
      const content = tag.getAttribute("content") || tag.getAttribute("value");
      if (!content) continue;
      const key = property.toLowerCase();
      if (!metaMap[key]) {
        metaMap[key] = content.trim();
      }
    }

    const baseUrl = response.url || url;

    const heroImages = collectHeroImages(metaMap, baseUrl);
    const logoImages = collectLogos(root, baseUrl);

    const title = pickFirst(metaMap, TITLE_META_KEYS) || root.querySelector("title")?.textContent?.trim();
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

    const screenshot = SCREENSHOT_ENDPOINT(url);
    const logo = logoImages[0] ?? LOGO_ENDPOINT(url);
    const image = heroImages[0] ?? logo ?? screenshot;

    return {
      title,
      description,
      image,
      logo,
      screenshot,
      raw: {
        meta: metaMap,
        heroes: heroImages,
        logos: logoImages
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function collectHeroImages(metaMap: Record<string, string>, baseUrl: string) {
  const set = new Set<string>();
  for (const key of HERO_META_KEYS) {
    const value = metaMap[key];
    const resolved = resolveUrl(baseUrl, value);
    if (resolved) {
      set.add(resolved);
    }
  }
  return Array.from(set);
}

function collectLogos(root: ReturnType<typeof parse>, baseUrl: string) {
  const links = root.querySelectorAll("link");
  const set = new Set<string>();
  for (const link of links) {
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    if (!rel.includes("icon") && !rel.includes("apple-touch")) continue;
    const href = link.getAttribute("href");
    const resolved = resolveUrl(baseUrl, href);
    if (resolved) {
      set.add(resolved);
    }
  }
  return Array.from(set);
}

function pickFirst(metaMap: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = metaMap[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function mergeMetadata(sources: SitePreview[], url: string): SitePreview {
  const combined: SitePreview = {
    title: undefined,
    description: undefined,
    image: undefined,
    logo: undefined,
    screenshot: SCREENSHOT_ENDPOINT(url),
    raw: {
      sources: sources.map((source) => source.raw ?? source)
    }
  };

  for (const meta of sources) {
    if (!combined.title && meta.title) {
      combined.title = meta.title;
    }
    if (!combined.description && meta.description) {
      combined.description = meta.description;
    }
    if (!combined.image && meta.image) {
      combined.image = meta.image;
    }
    if (!combined.logo && meta.logo) {
      combined.logo = meta.logo;
    }
    if (meta.screenshot) {
      combined.screenshot = meta.screenshot;
    }
  }

  if (!combined.logo) {
    combined.logo = LOGO_ENDPOINT(url);
  }
  if (!combined.image) {
    combined.image = combined.logo || combined.screenshot;
  }

  return combined;
}

function resolveUrl(base: string, candidate?: string | null) {
  if (!candidate) return undefined;
  try {
    return new URL(candidate, base).toString();
  } catch (error) {
    return undefined;
  }
}

function buildPreviewUrl(template: string, target: string) {
  if (template.includes("{{url}}")) {
    return template.replace("{{url}}", encodeURIComponent(target));
  }
  const separator = template.includes("?") ? "&" : "?";
  return `${template}${separator}url=${encodeURIComponent(target)}`;
}

function normaliseRemotePreview(payload: unknown, url: string): SitePreview | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const data = payload as Record<string, unknown>;

  const title = pickValue(data, ["title", "name", "headline", "pageTitle"]);
  const description = pickValue(data, ["description", "summary", "excerpt"]);
  const image = pickValue(data, [
    "image",
    "imageUrl",
    "thumbnail",
    "thumbnailUrl",
    "ogImage",
    "image_url"
  ]);
  const logo = pickValue(data, ["logo", "logoUrl", "icon", "iconUrl"]);
  const screenshot = pickValue(data, ["screenshot", "screenshotUrl", "capture"]);

  const preview: SitePreview = {
    title: typeof title === "string" ? title : undefined,
    description: typeof description === "string" ? description : undefined,
    image: normaliseUrlValue(image, url),
    logo: normaliseUrlValue(logo, url),
    screenshot: normaliseUrlValue(screenshot, url),
    raw: data
  };

  return preview;
}

function pickValue(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (value && typeof value === "object") {
      // Look for nested url fields
      const nested = value as Record<string, unknown>;
      const nestedUrl: string | undefined = pickValue(nested, ["url", "src", "href", "source"]);
      if (nestedUrl) {
        return nestedUrl;
      }
    }
  }
  return undefined;
}

function normaliseUrlValue(value: unknown, base: string) {
  if (typeof value !== "string") return undefined;
  return resolveUrl(base, value);
}
