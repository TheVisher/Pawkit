/**
 * URL validation and SSRF protection utilities
 * Prevents Server-Side Request Forgery attacks by blocking access to:
 * - Private IP ranges (RFC 1918)
 * - Loopback addresses
 * - Link-local addresses
 * - Cloud metadata services
 */

// Private IP ranges to block (RFC 1918)
const PRIVATE_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // 127.0.0.0/8 (loopback)
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^0\./,                     // 0.0.0.0/8
  /^::1$/,                    // IPv6 loopback
  /^fe80:/i,                  // IPv6 link-local
  /^fc00:/i,                  // IPv6 unique local
  /^fd00:/i,                  // IPv6 unique local
];

// Dangerous hostnames to block
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',  // Google Cloud metadata
  '169.254.169.254',           // AWS/Azure/GCP metadata service
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

/**
 * Validates a URL for SSRF protection
 * Throws UrlValidationError if the URL is not safe to fetch
 */
export function validateUrlForFetch(urlString: string): URL {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    throw new UrlValidationError('Invalid URL format');
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new UrlValidationError(`Protocol '${url.protocol}' is not allowed`);
  }

  // Check for blocked hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new UrlValidationError('Access to this hostname is not allowed');
  }

  // Check for private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      throw new UrlValidationError('Access to private IP ranges is not allowed');
    }
  }

  // Additional checks for IP addresses
  if (isIpAddress(hostname)) {
    // Block any remaining private IPs not caught above
    if (isPrivateIp(hostname)) {
      throw new UrlValidationError('Access to private IP addresses is not allowed');
    }
  }

  return url;
}

/**
 * Checks if a string is an IP address
 */
function isIpAddress(hostname: string): boolean {
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  // IPv6
  if (hostname.includes(':')) {
    return true;
  }
  return false;
}

/**
 * Checks if an IP is in a private range
 */
function isPrivateIp(ip: string): boolean {
  // Parse IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    const parts = ip.split('.').map(Number);

    // Validate octets
    if (parts.some(part => part < 0 || part > 255)) {
      return true; // Invalid IP, treat as private for safety
    }

    // 10.0.0.0/8
    if (parts[0] === 10) return true;

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;

    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 0.0.0.0/8
    if (parts[0] === 0) return true;

    // Broadcast
    if (parts[0] === 255) return true;
  }

  // IPv6 private ranges
  const ipLower = ip.toLowerCase();
  if (ipLower === '::1') return true; // loopback
  if (ipLower.startsWith('fe80:')) return true; // link-local
  if (ipLower.startsWith('fc00:')) return true; // unique local
  if (ipLower.startsWith('fd00:')) return true; // unique local
  if (ipLower === '::') return true; // unspecified

  return false;
}

/**
 * Safe wrapper around fetch that validates URLs before fetching
 */
export async function safeFetch(
  urlString: string,
  init?: RequestInit
): Promise<Response> {
  const url = validateUrlForFetch(urlString);
  return fetch(url.toString(), init);
}
