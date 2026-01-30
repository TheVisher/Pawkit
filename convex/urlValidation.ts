/**
 * Shared URL validation utilities for SSRF protection.
 * Used by both HTTP endpoints and Convex mutations.
 */

/**
 * Check if a hostname is a private/internal network address.
 */
export function isPrivateHost(host: string): boolean {
  // Check for localhost and loopback
  if (host === "localhost") return true;
  if (host === "::1") return true;

  // Check for .local domains
  if (host.endsWith(".local")) return true;

  // IPv4 checks
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;

    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 (loopback)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
  }

  // IPv6 unique-local (fc00::/7), link-local (fe80::/10)
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80")) return true;

  return false;
}

/**
 * Validate that a URL is safe to fetch (not internal/private network).
 * Returns { ok: true, url: string } or { ok: false, error: string }
 */
export function validateExternalUrl(input: string):
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
