/**
 * Convex Site URL utility
 *
 * Convex HTTP routes are served from a different domain than queries/mutations:
 * - Queries/Mutations: https://<deployment>.convex.cloud
 * - HTTP routes: https://<deployment>.convex.site
 *
 * This utility gets the site URL for making HTTP requests.
 */

/**
 * Get the Convex site URL for HTTP routes
 *
 * Prefers VITE_CONVEX_SITE_URL if set,
 * otherwise derives from VITE_CONVEX_URL by replacing .cloud with .site
 */
export function getConvexSiteUrl(): string | null {
  // Check for explicit site URL first
  const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  if (siteUrl) {
    return siteUrl;
  }

  // Derive from cloud URL
  const cloudUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (cloudUrl) {
    return cloudUrl.replace('.convex.cloud', '.convex.site');
  }

  return null;
}

/**
 * Build a full URL for a Convex HTTP endpoint
 */
export function buildConvexHttpUrl(path: string): string {
  const siteUrl = getConvexSiteUrl();

  if (!siteUrl) {
    // Fallback to relative URL (works if Next.js proxies, but shouldn't happen)
    console.warn('[ConvexSiteUrl] No Convex URL configured, using relative path');
    return path;
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${siteUrl}${normalizedPath}`;
}
