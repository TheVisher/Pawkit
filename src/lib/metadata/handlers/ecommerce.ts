/**
 * Generic E-commerce Metadata Handler
 * Extracts product metadata from common e-commerce sites
 */

import * as cheerio from 'cheerio';
import type { MetadataResult } from '../types';
import { DEFAULT_CONFIG } from '../types';

// E-commerce domains
const ECOMMERCE_DOMAINS = [
  // Major retailers
  'bestbuy.com',
  'target.com',
  'walmart.com',
  'ebay.com',
  'etsy.com',
  'wayfair.com',
  'homedepot.com',
  'lowes.com',
  'ikea.com',
  'newegg.com',
  // Electronics brands
  'lg.com',
  'samsung.com',
  'apple.com',
  // Clothing/shoes
  'nike.com',
  'adidas.com',
  'vans.com',
  // International
  'aliexpress.com',
  'alibaba.com',
  // 3D printing/maker
  'makerworld.com',
  'thingiverse.com',
  'printables.com',
  // Shopify detection (handled specially)
  'myshopify.com',
];

// Shopify detection patterns (used in addition to domain check)
const SHOPIFY_PATTERNS = [
  'cdn.shopify.com',
  'shopify.com',
];

/**
 * Check if URL is an e-commerce site
 */
export function isEcommerceUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return ECOMMERCE_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Check if page appears to be a Shopify store
 */
function isShopifyStore($: cheerio.CheerioAPI, url: string): boolean {
  // Check URL patterns
  if (SHOPIFY_PATTERNS.some(pattern => url.includes(pattern))) {
    return true;
  }

  // Check for Shopify-specific elements
  const shopifyMeta = $('meta[name="shopify-checkout-api-token"]').length > 0;
  const shopifyScript = $('script[src*="shopify"]').length > 0;
  const shopifyLink = $('link[href*="cdn.shopify.com"]').length > 0;

  return shopifyMeta || shopifyScript || shopifyLink;
}

/**
 * Get all e-commerce domains for handler registration
 */
export function getEcommerceDomains(): string[] {
  return [...ECOMMERCE_DOMAINS];
}

// Generic product image selectors (in priority order)
// More specific selectors first, then generic ones
const PRODUCT_IMAGE_SELECTORS = [
  // Schema.org product markup
  '[itemprop="image"] img',
  '[itemprop="image"]',
  'meta[itemprop="image"]',

  // Common product image classes
  '.product-image img',
  '.product-img img',
  '.main-product-image img',
  '#primary-product-image',
  '.primary-image img',
  '.main-image img',
  '#product-image img',
  '#main-image img',

  // Gallery/carousel primary images
  '.product-gallery img',
  '.gallery-image img',
  '.carousel-item.active img',

  // E-commerce platform specific
  // Shopify
  '.product__media img',
  '.product-featured-image img',
  '.featured-image img',

  // WooCommerce
  '.woocommerce-product-gallery__image img',
  '.woocommerce-main-image img',

  // BigCommerce
  '.productView-image img',

  // Magento
  '.gallery-placeholder img',
  '.fotorama__stage img',

  // Best Buy
  '.primary-image img',
  '.shop-media-gallery img',

  // Target
  '.slideDeckPicture img',

  // Walmart
  '.hover-zoom-hero-image img',

  // eBay
  '.ux-image-magnify__image img',
  '.img-wrapper img',

  // Etsy
  '.listing-page-image-container img',
  '.carousel-image img',

  // 3D printing sites
  '.model-image img',
  '.model-preview img',
  '.thumbnail img',

  // LG/Electronics
  '.visual-product img',
  '.product-visual img',
  '.hero-product-image img',

  // Generic class patterns
  'img[class*="product"]',
  'img[class*="model"]',
  'img[class*="hero"]',
  'img[class*="main"]',
  'img[class*="primary"]',

  // Fallback to any large image in main content
  'main img',
  '#content img',
  '.content img',
];

// Meta tag priority keys
const TITLE_META_KEYS = ['og:title', 'twitter:title', 'title', 'product:title'];
const DESCRIPTION_META_KEYS = ['og:description', 'twitter:description', 'description', 'product:description'];

// Google favicon service
const FAVICON_ENDPOINT = (url: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;

/**
 * Extract product image from e-commerce page
 */
function extractProductImage($: cheerio.CheerioAPI, baseUrl: string): string | null {
  for (const selector of PRODUCT_IMAGE_SELECTORS) {
    const element = $(selector).first();
    if (!element.length) continue;

    const tagName = element.prop('tagName')?.toLowerCase();

    if (tagName === 'meta') {
      const content = element.attr('content');
      if (content) {
        return resolveUrl(baseUrl, content);
      }
    } else if (tagName === 'img') {
      // Try various image source attributes
      const src =
        element.attr('src') ||
        element.attr('data-src') ||
        element.attr('data-lazy-src') ||
        element.attr('data-original') ||
        element.attr('data-zoom-image') ||
        element.attr('data-large');

      if (src && !src.includes('placeholder') && !src.includes('spinner')) {
        return resolveUrl(baseUrl, src);
      }
    } else {
      // Check for content attribute (meta-like elements)
      const content = element.attr('content');
      if (content) {
        return resolveUrl(baseUrl, content);
      }

      // Try to find img inside the element
      const img = element.find('img').first();
      if (img.length) {
        const src =
          img.attr('src') ||
          img.attr('data-src') ||
          img.attr('data-lazy-src');

        if (src && !src.includes('placeholder') && !src.includes('spinner')) {
          return resolveUrl(baseUrl, src);
        }
      }
    }
  }

  return null;
}

/**
 * Extract images from JSON-LD structured data
 */
function extractJsonLdImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonText = $(el).html();
      if (!jsonText) return;

      const data = JSON.parse(jsonText);
      const items = data['@graph'] || [data];

      for (const item of items) {
        const itemType = item['@type'];
        const isProduct = Array.isArray(itemType)
          ? itemType.some((t: string) => t.includes('Product') || t === 'ItemPage')
          : itemType?.includes?.('Product') || itemType === 'ItemPage';

        if (isProduct && item.image) {
          const productImages = Array.isArray(item.image) ? item.image : [item.image];

          for (const img of productImages) {
            const imgUrl = typeof img === 'string' ? img : img?.url;
            if (imgUrl) {
              const resolved = resolveUrl(baseUrl, imgUrl);
              if (resolved && !images.includes(resolved)) {
                images.push(resolved);
              }
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return images;
}

/**
 * Extract metadata from meta tags
 */
function extractMetaTags($: cheerio.CheerioAPI): Record<string, string> {
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

  return metaMap;
}

/**
 * Pick first matching value from meta map
 */
function pickFirst(metaMap: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    if (metaMap[key]) {
      return metaMap[key];
    }
  }
  return null;
}

/**
 * Resolve relative URL against base
 */
function resolveUrl(base: string, relative: string): string | null {
  if (!relative) return null;
  try {
    return new URL(relative, base).toString();
  } catch {
    return null;
  }
}

/**
 * Fetch and extract metadata from e-commerce product page
 */
export async function fetchEcommerceMetadata(url: string): Promise<MetadataResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout);

  // Extract domain
  let domain: string;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace('www.', '');
  } catch {
    domain = 'unknown';
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`E-commerce request failed with ${response.status}`);
    }

    // Get final URL after redirects
    const finalUrl = response.url || url;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Determine source (generic or shopify)
    const isShopify = isShopifyStore($, finalUrl);
    const source = isShopify ? 'shopify-handler' : 'ecommerce-handler';

    // Collect all images
    const allImages: string[] = [];

    // 1. Extract from JSON-LD (most reliable for structured data)
    const jsonLdImages = extractJsonLdImages($, finalUrl);
    allImages.push(...jsonLdImages);

    // 2. Extract from DOM selectors
    const domImage = extractProductImage($, finalUrl);
    if (domImage && !allImages.includes(domImage)) {
      allImages.unshift(domImage); // Prioritize DOM image
    }

    // Extract meta tags
    const metaMap = extractMetaTags($);

    // 3. Fall back to og:image if no product images found
    if (allImages.length === 0) {
      const ogImage = metaMap['og:image'] || metaMap['og:image:url'];
      if (ogImage) {
        const resolved = resolveUrl(finalUrl, ogImage);
        if (resolved) {
          allImages.push(resolved);
        }
      }
    }

    // 4. Fall back to twitter:image
    if (allImages.length === 0) {
      const twitterImage = metaMap['twitter:image'] || metaMap['twitter:image:src'];
      if (twitterImage) {
        const resolved = resolveUrl(finalUrl, twitterImage);
        if (resolved) {
          allImages.push(resolved);
        }
      }
    }

    // Extract title
    let title = pickFirst(metaMap, TITLE_META_KEYS);
    if (!title) {
      title = $('title').first().text().trim() || null;
    }

    // Extract description
    const description = pickFirst(metaMap, DESCRIPTION_META_KEYS);

    // Get favicon
    let favicon: string | null = null;
    const iconLink = $('link[rel*="icon"]').first();
    if (iconLink.length) {
      const href = iconLink.attr('href');
      if (href) {
        favicon = resolveUrl(finalUrl, href);
      }
    }
    if (!favicon) {
      favicon = FAVICON_ENDPOINT(finalUrl);
    }

    // Primary image is first in array
    const primaryImage = allImages.length > 0 ? allImages[0] : null;

    return {
      title: title || 'Product',
      description: description || 'View product',
      image: primaryImage,
      images: allImages.length > 0 ? allImages : null,
      favicon,
      domain,
      source,
      shouldPersistImage: false, // E-commerce images are stable
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[E-commerce Handler] Error:', error);

    // Return partial result
    return {
      title: 'Product',
      description: 'View product',
      image: null,
      images: null,
      favicon: FAVICON_ENDPOINT(url),
      domain,
      source: 'ecommerce-handler',
      shouldPersistImage: false,
    };
  }
}

export default fetchEcommerceMetadata;
