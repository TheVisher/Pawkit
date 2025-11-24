import { parse } from "node-html-parser";
import { validateUrlForFetch, safeFetch, UrlValidationError } from "@/lib/utils/url-validator";

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
  
  // Validate URL for SSRF protection
  try {
    validateUrlForFetch(url);
  } catch (error) {
    if (error instanceof UrlValidationError) {
      return undefined;
    }
    throw error;
  }

  // Special handling for YouTube - use their reliable thumbnail API
  const youtubeVideoId = extractYouTubeVideoId(url);
  if (youtubeVideoId) {
    return fetchYouTubeMetadata(url, youtubeVideoId);
  }

  // Special handling for Reddit - extract post images
  if (isRedditUrl(url)) {
    const redditMeta = await fetchRedditMetadata(url).catch((err) => {
      return undefined;
    });
    if (redditMeta) {
      return redditMeta;
    }
  }

  // Special handling for TikTok - use their oEmbed API
  if (isTikTokUrl(url)) {
    const tiktokMeta = await fetchTikTokMetadata(url).catch(() => undefined);
    if (tiktokMeta) {
      return tiktokMeta;
    }
  }

  // Special handling for Amazon - target product images
  if (isAmazonUrl(url)) {
    const amazonMeta = await fetchAmazonMetadata(url).catch(() => undefined);
    if (amazonMeta) {
      return amazonMeta;
    }
  }

  // Special handling for e-commerce sites - target product images
  if (isEcommerceSite(url)) {
    const ecommerceMeta = await fetchEcommerceMetadata(url).catch(() => undefined);
    if (ecommerceMeta) {
      return ecommerceMeta;
    }
  }

  const results: SitePreview[] = [];

  if (previewServiceUrl) {
    const remote = await fetchRemotePreview(url, previewServiceUrl).catch((err) => {
      return undefined;
    });
    if (remote) {
      results.push(remote);
    }
  }

  const scraped = await scrapeSiteMetadata(url).catch((err) => {
    return undefined;
  });
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
    const response = await safeFetch(url, {
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

    // Log some key meta tags for debugging
    const keyTags = ['og:image', 'og:title', 'og:description', 'twitter:image', 'twitter:title', 'description', 'title'];
    console.log('[Metadata] Key meta tags found:', keyTags.map(tag => ({ [tag]: metaMap[tag] })).filter(obj => Object.values(obj)[0]));

    const baseUrl = response.url || url;

    const heroImages = collectHeroImages(metaMap, baseUrl, html);
    const logoImages = collectLogos(root, baseUrl);

    const title = pickFirst(metaMap, TITLE_META_KEYS) || root.querySelector("title")?.textContent?.trim();
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

    const screenshot = SCREENSHOT_ENDPOINT(url);
    const logo = logoImages[0] ?? LOGO_ENDPOINT(url);
    // Prefer screenshot over logo if no hero image - shows actual content
    let image = heroImages[0] ?? screenshot ?? logo;
    
    console.log('[Metadata] Image selection debug:', {
      heroImages: heroImages,
      screenshot: screenshot,
      logo: logo,
      selectedImage: image
    });
    
    // Convert HTTP image URLs to HTTPS to avoid mixed content issues
    if (image && image.startsWith('http://')) {
      image = image.replace('http://', 'https://');
      console.log('[Metadata] Converted HTTP image to HTTPS:', image.substring(0, 100));
    }
    
    // Validate that the image URL is actually an image (not a 404 page)
    if (image && image !== screenshot && image !== logo) {
      try {
        console.log('[Metadata] Validating image URL:', image.substring(0, 100));
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const imageResponse = await fetch(image, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const contentType = imageResponse.headers.get('content-type');
        console.log('[Metadata] Image validation response:', {
          status: imageResponse.status,
          contentType: contentType,
          ok: imageResponse.ok
        });
        
        if (!imageResponse.ok || !contentType?.startsWith('image/')) {
          image = screenshot;
        } else {
        }
      } catch (error) {
        console.log('[Metadata] Image URL validation failed, falling back to screenshot:', error instanceof Error ? error.message : String(error));
        image = screenshot;
      }
    }

    console.log('[Metadata] Scraping results:', {
      title: title?.substring(0, 50),
      description: description?.substring(0, 50),
      hasImage: !!image,
      imageUrl: image?.substring(0, 100),
      heroImages: heroImages.length,
      logoImages: logoImages.length,
      metaMapKeys: Object.keys(metaMap).filter(key => key.includes('image') || key.includes('og:') || key.includes('twitter:')).slice(0, 10)
    });

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

function collectHeroImages(metaMap: Record<string, string>, baseUrl: string, html?: string) {
  const set = new Set<string>();
  for (const key of HERO_META_KEYS) {
    const value = metaMap[key];
    const resolved = resolveUrl(baseUrl, value);
    if (resolved) {
      // Convert HTTP to HTTPS to avoid mixed content issues
      const httpsUrl = resolved.startsWith('http://') ? resolved.replace('http://', 'https://') : resolved;
      set.add(httpsUrl);
    }
  }

  // Fallback: Try JSON-LD structured data if no og:image found
  if (set.size === 0 && html) {
    const jsonLdImage = extractJsonLdImage(html, baseUrl);
    if (jsonLdImage) {
      const httpsUrl = jsonLdImage.startsWith('http://') ? jsonLdImage.replace('http://', 'https://') : jsonLdImage;
      set.add(httpsUrl);
      console.log('[Metadata] Found image from JSON-LD:', httpsUrl.substring(0, 100));
    }
  }

  return Array.from(set);
}

// Extract image from JSON-LD structured data (Schema.org Product, Article, etc.)
function extractJsonLdImage(html: string, baseUrl: string): string | undefined {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonLd = JSON.parse(match[1]);
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

      for (const item of items) {
        const image = extractImageFromJsonLdItem(item, baseUrl);
        if (image) return image;

        // Check @graph structure (used by some sites like Yoast SEO)
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const graphItem of item['@graph']) {
            const graphImage = extractImageFromJsonLdItem(graphItem, baseUrl);
            if (graphImage) return graphImage;
          }
        }
      }
    } catch {
      // Invalid JSON, skip this script tag
    }
  }
  return undefined;
}

// Helper to extract image from a single JSON-LD item
function extractImageFromJsonLdItem(item: any, baseUrl: string): string | undefined {
  if (!item || typeof item !== 'object') return undefined;

  // Check direct image property
  if (item.image) {
    if (typeof item.image === 'string') {
      return resolveUrl(baseUrl, item.image);
    }
    if (Array.isArray(item.image)) {
      const first = item.image[0];
      if (typeof first === 'string') return resolveUrl(baseUrl, first);
      if (first?.url) return resolveUrl(baseUrl, first.url);
      if (first?.contentUrl) return resolveUrl(baseUrl, first.contentUrl);
    }
    if (item.image.url) return resolveUrl(baseUrl, item.image.url);
    if (item.image.contentUrl) return resolveUrl(baseUrl, item.image.contentUrl);
  }

  // Check thumbnailUrl (common in VideoObject, Product)
  if (item.thumbnailUrl) {
    if (typeof item.thumbnailUrl === 'string') {
      return resolveUrl(baseUrl, item.thumbnailUrl);
    }
    if (Array.isArray(item.thumbnailUrl) && item.thumbnailUrl[0]) {
      return resolveUrl(baseUrl, item.thumbnailUrl[0]);
    }
  }

  // Check primaryImageOfPage (WebPage schema)
  if (item.primaryImageOfPage?.url) {
    return resolveUrl(baseUrl, item.primaryImageOfPage.url);
  }

  return undefined;
}

function collectLogos(root: ReturnType<typeof parse>, baseUrl: string) {
  const links = root.querySelectorAll("link");
  const set = new Set<string>();
  for (const link of links) {
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    if (!rel.includes("icon") && !rel.includes("apple-touch")) continue;
    const href = link.getAttribute("href");
    if (!href) continue;
    const resolved = resolveUrl(href, baseUrl);
    if (resolved) {
      // Convert HTTP to HTTPS to avoid mixed content issues
      const httpsUrl = resolved.startsWith('http://') ? resolved.replace('http://', 'https://') : resolved;
      set.add(httpsUrl);
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

// TikTok-specific helpers
function isTikTokUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('tiktok.com');
  } catch {
    return false;
  }
}

async function fetchTikTokMetadata(url: string): Promise<SitePreview> {
  // TikTok oEmbed API - provides reliable thumbnails for videos
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      // TikTok oEmbed returns: title, author_name, author_url, thumbnail_url, thumbnail_width, thumbnail_height
      return {
        title: data.title || 'TikTok Video',
        description: data.author_name ? `By ${data.author_name}` : 'Watch on TikTok',
        image: data.thumbnail_url || undefined,
        logo: LOGO_ENDPOINT(url),
        screenshot: SCREENSHOT_ENDPOINT(url),
        raw: {
          ...data,
          source: 'tiktok-oembed'
        }
      };
    }
  } catch (error) {
  }

  // Fallback to scraping (for photo posts and when oEmbed fails)
  try {
    const scraped = await scrapeTikTokPage(url);
    if (scraped) {
      return scraped;
    }
  } catch (error) {
  }

  return {
    title: 'TikTok Content',
    description: 'View on TikTok',
    image: LOGO_ENDPOINT(url),
    logo: LOGO_ENDPOINT(url),
    screenshot: SCREENSHOT_ENDPOINT(url)
  };
}

async function scrapeTikTokPage(url: string): Promise<SitePreview | undefined> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TikTok request failed with ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);

    // Get meta tags
    const metaTags = root.querySelectorAll('meta');
    const metaMap: Record<string, string> = {};
    for (const tag of metaTags) {
      const property = tag.getAttribute('property') || tag.getAttribute('name');
      if (!property) continue;
      const content = tag.getAttribute('content');
      if (!content) continue;
      metaMap[property.toLowerCase()] = content.trim();
    }

    const title = pickFirst(metaMap, TITLE_META_KEYS) || root.querySelector('title')?.textContent?.trim();
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);
    const image = pickFirst(metaMap, HERO_META_KEYS);

    // TikTok blocks screenshot services, so use logo as final fallback
    const logo = LOGO_ENDPOINT(url);
    const screenshot = SCREENSHOT_ENDPOINT(url);
    const finalImage = image || logo;

    return {
      title: title || 'TikTok Content',
      description: description || 'View on TikTok',
      image: finalImage,
      logo: logo,
      screenshot: screenshot,
      raw: {
        meta: metaMap,
        source: 'tiktok-scraper',
        hasMetaImage: !!image
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Amazon-specific helpers
function isAmazonUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('amazon.com') ||
           hostname.includes('amazon.co.uk') ||
           hostname.includes('amazon.ca') ||
           hostname.includes('amazon.de') ||
           hostname.includes('amazon.fr') ||
           hostname.includes('amazon.it') ||
           hostname.includes('amazon.es') ||
           hostname.includes('amazon.co.jp') ||
           hostname.includes('a.co') ||        // Amazon short links
           hostname.includes('amzn.to') ||     // Amazon short links
           hostname.includes('amzn.com');      // Amazon short links
  } catch {
    return false;
  }
}

async function fetchAmazonMetadata(url: string): Promise<SitePreview> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Amazon request failed with ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);

    // Amazon-specific image selectors (in priority order)
    const imageSelectors = [
      '#landingImage',           // Main product image
      '#imgBlkFront',            // Alternative main image
      '#ebooksImgBlkFront',      // E-book cover
      '.a-dynamic-image',        // Dynamic image container
      'img[data-old-hires]',     // High-res image data
      'img[data-a-dynamic-image]' // Another dynamic image
    ];

    let productImage: string | undefined;
    for (const selector of imageSelectors) {
      const img = root.querySelector(selector);
      if (img) {
        // Try multiple attributes
        const src = img.getAttribute('data-old-hires') ||
                   img.getAttribute('src') ||
                   img.getAttribute('data-a-dynamic-image');

        if (src) {
          // Parse dynamic image JSON if needed
          if (src.startsWith('{')) {
            try {
              const imageObj = JSON.parse(src);
              const imageUrls = Object.keys(imageObj);
              if (imageUrls.length > 0) {
                productImage = imageUrls[0];
                break;
              }
            } catch {
              // Not JSON, use as-is
              productImage = src;
              break;
            }
          } else {
            productImage = src;
            break;
          }
        }
      }
    }

    // Get title and description from meta tags
    const metaTags = root.querySelectorAll('meta');
    const metaMap: Record<string, string> = {};
    for (const tag of metaTags) {
      const property = tag.getAttribute('property') || tag.getAttribute('name');
      if (!property) continue;
      const content = tag.getAttribute('content');
      if (!content) continue;
      metaMap[property.toLowerCase()] = content.trim();
    }

    const title = pickFirst(metaMap, TITLE_META_KEYS) || root.querySelector('title')?.textContent?.trim();
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

    return {
      title: title || 'Amazon Product',
      description: description || 'View on Amazon',
      image: productImage || SCREENSHOT_ENDPOINT(url),
      logo: LOGO_ENDPOINT(url),
      screenshot: SCREENSHOT_ENDPOINT(url),
      raw: {
        productImage,
        source: 'amazon-scraper'
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// E-commerce site helpers
function isEcommerceSite(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Common e-commerce domains
    const ecommerceDomains = [
      'bestbuy.com',
      'target.com',
      'walmart.com',
      'lg.com',
      'samsung.com',
      'apple.com',
      'newegg.com',
      'ebay.com',
      'etsy.com',
      'shopify.com',
      'wayfair.com',
      'homedepot.com',
      'lowes.com',
      'ikea.com',
      'aliexpress.com',
      'alibaba.com',
      'vans.com',
      'nike.com',
      'adidas.com',
      'makerworld.com',      // 3D printing models
      'thingiverse.com',     // 3D printing models
      'printables.com'       // 3D printing models
    ];

    return ecommerceDomains.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

async function fetchEcommerceMetadata(url: string): Promise<SitePreview> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`E-commerce request failed with ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);

    // E-commerce product image selectors (common patterns)
    // Note: Order matters - more specific selectors first
    const imageSelectors = [
      // LG-specific selectors
      '.visual-product img',
      '.product-visual img',
      '.hero-product-image img',
      // MakerWorld/3D printing site selectors
      '.model-image img',
      '.model-preview img',
      '.thumbnail img',
      // Generic product image selectors
      'meta[property="product:image"]',
      '[itemprop="image"] img',
      '[itemprop="image"]',
      '.product-image img',
      '.product-img img',
      '.main-image img',
      '.primary-image img',
      '#product-image img',
      '#main-image img',
      'img[class*="product"]',
      'img[class*="model"]',
      'img[class*="hero"]',
      // Fallback to meta tags (often low quality but better than nothing)
      'meta[property="og:image"]',
      'meta[name="twitter:image"]'
    ];

    let productImage: string | undefined;
    for (const selector of imageSelectors) {
      const element = root.querySelector(selector);
      if (element) {
        const tagName = element.tagName?.toLowerCase();

        if (tagName === 'meta') {
          productImage = element.getAttribute('content');
          if (productImage) break;
        } else if (tagName === 'img') {
          productImage = element.getAttribute('src') ||
                        element.getAttribute('data-src') ||
                        element.getAttribute('data-lazy-src');
          if (productImage) break;
        } else {
          // Try to find img inside the element
          const img = element.querySelector('img');
          if (img) {
            productImage = img.getAttribute('src') ||
                          img.getAttribute('data-src') ||
                          img.getAttribute('data-lazy-src');
            if (productImage) break;
          }
        }
      }
    }

    // Resolve relative URLs
    const baseUrl = response.url || url;
    if (productImage) {
      productImage = resolveUrl(baseUrl, productImage);
    }

    // Get title and description from meta tags
    const metaTags = root.querySelectorAll('meta');
    const metaMap: Record<string, string> = {};
    for (const tag of metaTags) {
      const property = tag.getAttribute('property') || tag.getAttribute('name');
      if (!property) continue;
      const content = tag.getAttribute('content');
      if (!content) continue;
      metaMap[property.toLowerCase()] = content.trim();
    }

    const title = pickFirst(metaMap, TITLE_META_KEYS) || root.querySelector('title')?.textContent?.trim();
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

    // Use screenshot if no product image found - shows actual page content
    const screenshot = SCREENSHOT_ENDPOINT(url);
    const finalImage = productImage || screenshot;

    return {
      title: title || 'Product',
      description: description || 'View product',
      image: finalImage,
      logo: LOGO_ENDPOINT(url),
      screenshot: screenshot,
      raw: {
        productImage,
        source: 'ecommerce-scraper',
        hasProductImage: !!productImage
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// YouTube-specific helpers
function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Handle youtube.com URLs
    if (hostname.includes('youtube.com')) {
      // Standard watch URL: youtube.com/watch?v=VIDEO_ID
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;

      // Shortened URL: youtube.com/shorts/VIDEO_ID
      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      // Embed URL: youtube.com/embed/VIDEO_ID
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }

    // Handle youtu.be URLs: youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1).split('/')[0];
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeMetadata(url: string, videoId: string): Promise<SitePreview> {
  // YouTube's reliable thumbnail API - always works
  // Try maxresdefault (1280x720) first, fallback to hqdefault (480x360)
  const maxResThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const hqThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Check if maxresdefault exists (not all videos have it)
  let thumbnail = maxResThumbnail;
  try {
    const response = await fetch(maxResThumbnail, { method: 'HEAD' });
    if (!response.ok || response.headers.get('content-length') === '0') {
      thumbnail = hqThumbnail;
    }
  } catch {
    thumbnail = hqThumbnail;
  }

  // Try YouTube's oEmbed API for reliable title/description
  let title: string | undefined = undefined;
  let description: string | undefined = undefined;

  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const oEmbedResponse = await fetch(oEmbedUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (oEmbedResponse.ok) {
      const oEmbedData = await oEmbedResponse.json();
      title = oEmbedData.title;
      description = oEmbedData.author_name ? `by ${oEmbedData.author_name}` : undefined;
    }
  } catch (error) {
    console.log('[YouTube] oEmbed failed, falling back to scraping:', error instanceof Error ? error.message : String(error));
  }

  // Fallback to scraping if oEmbed fails
  if (!title) {
    try {
      const scraped = await scrapeSiteMetadata(url).catch(() => undefined);
      if (scraped) {
        title = scraped.title;
        description = scraped.description;
      }
    } catch {
    }
  }

  return {
    title: title || `YouTube Video - ${videoId}`,
    description: description || 'Watch on YouTube',
    image: thumbnail,
    logo: LOGO_ENDPOINT(url),
    screenshot: SCREENSHOT_ENDPOINT(url),
    raw: {
      videoId,
      thumbnailUrl: thumbnail,
      source: 'youtube-api'
    }
  };
}

// Reddit-specific helpers
function isRedditUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('reddit.com');
  } catch {
    return false;
  }
}

async function fetchRedditMetadata(url: string): Promise<SitePreview> {
  // Try Reddit's oEmbed API first (less likely to be blocked)
  try {
    const oembedUrl = `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedResponse = await fetch(oembedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });


    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json();

      // Only use oEmbed if it has a thumbnail, otherwise fall through
      if (oembedData.thumbnail_url) {
        return {
          title: oembedData.title || 'Reddit Post',
          description: oembedData.author_name ? `Posted by ${oembedData.author_name}` : 'View on Reddit',
          image: oembedData.thumbnail_url,
          logo: LOGO_ENDPOINT(url),
          screenshot: SCREENSHOT_ENDPOINT(url),
          raw: {
            ...oembedData,
            source: 'reddit-oembed'
          }
        };
      } else {
      }
    }
  } catch (error) {
  }

  // Fallback to JSON API (often blocked on Vercel)
  const jsonUrl = url.endsWith('/') ? `${url}.json` : `${url}/.json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);


    if (response.ok) {
      const data = await response.json();

      // Reddit API returns an array with post data
      const post = data?.[0]?.data?.children?.[0]?.data;

      if (!post) {
        console.error('[Reddit] Response structure:', JSON.stringify(data).substring(0, 500));
      }

      if (post) {
        // Debug logging

        // Extract image from various Reddit post types
        let image: string | undefined;

        // 1. Gallery posts (check first - most specific)
        if (post.is_gallery && post.media_metadata) {
          const firstImageId = Object.keys(post.media_metadata)[0];
          const firstImage = post.media_metadata[firstImageId];
          if (firstImage?.s?.u) {
            // Decode HTML entities in URL
            image = firstImage.s.u.replace(/&amp;/g, '&');
          }
        }
        // 2. Direct image posts (i.reddit.it or i.redd.it)
        else if (post.post_hint === 'image' && post.url) {
          image = post.url;
        }
        // 3. Preview images (most reliable for various post types)
        else if (post.preview?.images?.[0]?.source?.url) {
          image = post.preview.images[0].source.url.replace(/&amp;/g, '&');
        }
        // 4. Video posts (use thumbnail)
        else if (post.is_video && post.thumbnail && post.thumbnail.startsWith('http')) {
          image = post.thumbnail;
        }
        // 5. External image URLs
        else if (post.url && (post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || post.url.includes('imgur.com'))) {
          image = post.url;
        }
        // 6. Fallback to thumbnail if available (but not default icons)
        else if (post.thumbnail && post.thumbnail.startsWith('http') && !post.thumbnail.includes('default')) {
          image = post.thumbnail;
        }


        return {
          title: post.title || 'Reddit Post',
          description: post.subreddit_name_prefixed ? `Posted in ${post.subreddit_name_prefixed}` : 'View on Reddit',
          image: image || LOGO_ENDPOINT(url),
          logo: LOGO_ENDPOINT(url),
          screenshot: SCREENSHOT_ENDPOINT(url),
          raw: {
            ...post,
            source: 'reddit-api'
          }
        };
      }
    }
  } catch (error) {
  }

  // Last resort: scrape the HTML page for images
  try {
    const scraped = await scrapeSiteMetadata(url);
    if (scraped) {
      return {
        ...scraped,
        raw: {
          ...scraped.raw,
          source: 'reddit-html-scrape'
        }
      };
    }
  } catch (error) {
  }

  // Ultimate fallback - Reddit blocks all server-side access methods
  return {
    title: 'Reddit Post',
    description: 'View on Reddit',
    image: LOGO_ENDPOINT(url),
    logo: LOGO_ENDPOINT(url),
    screenshot: SCREENSHOT_ENDPOINT(url)
  };
}
