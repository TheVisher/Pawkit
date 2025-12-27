/**
 * Link Checker Service
 * Checks if URLs are still valid and accessible
 */

// Standard browser User-Agent
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Request timeout (5 seconds for HEAD, 10 for GET fallback)
const HEAD_TIMEOUT = 5000;
const GET_TIMEOUT = 10000;

export type LinkStatus = 'ok' | 'broken' | 'redirect' | 'timeout' | 'error';

export interface LinkCheckResult {
  status: LinkStatus;
  statusCode?: number;
  redirectUrl?: string;
  error?: string;
}

/**
 * Check if hostname is a private/internal IP address
 */
function isPrivateIP(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();
  const BLOCKED_PATTERNS = [
    '127.', '0.0.0.0', 'localhost',
    '10.',
    '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.',
    '192.168.',
    '169.254.',
    '[::1]', 'fe80:', 'fc00:', 'fd00::'
  ];
  return BLOCKED_PATTERNS.some(pattern => lowerHost.startsWith(pattern));
}

/**
 * Check if a URL is accessible
 */
export async function checkLink(url: string): Promise<LinkCheckResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { status: 'error', error: 'Invalid URL format' };
  }

  // SSRF Protection
  if (isPrivateIP(parsedUrl.hostname)) {
    return { status: 'error', error: 'Cannot check private URLs' };
  }

  // Only allow HTTP(S)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { status: 'error', error: 'Only HTTP(S) URLs supported' };
  }

  // Try HEAD request first (faster)
  try {
    const headResult = await fetchWithTimeout(url, 'HEAD', HEAD_TIMEOUT);
    if (headResult) return headResult;
  } catch {
    // HEAD failed, try GET
  }

  // Fallback to GET request
  try {
    const getResult = await fetchWithTimeout(url, 'GET', GET_TIMEOUT);
    if (getResult) return getResult;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'timeout', error: 'Request timed out' };
    }
    return { status: 'error', error: 'Failed to fetch URL' };
  }

  return { status: 'error', error: 'Unknown error' };
}

/**
 * Fetch with timeout and proper error handling
 */
async function fetchWithTimeout(
  url: string,
  method: 'HEAD' | 'GET',
  timeout: number
): Promise<LinkCheckResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'manual', // Don't auto-follow redirects
    });
    clearTimeout(timeoutId);

    const statusCode = response.status;

    // Success (2xx)
    if (statusCode >= 200 && statusCode < 300) {
      return { status: 'ok', statusCode };
    }

    // Redirect (3xx)
    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Resolve relative redirects
        const redirectUrl = new URL(location, url).toString();
        return { status: 'redirect', statusCode, redirectUrl };
      }
      return { status: 'ok', statusCode }; // Treat as OK if no location
    }

    // Client error (4xx) - broken link
    if (statusCode >= 400 && statusCode < 500) {
      return { status: 'broken', statusCode };
    }

    // Server error (5xx) - might be temporary
    if (statusCode >= 500) {
      return { status: 'error', statusCode, error: `Server error: ${statusCode}` };
    }

    return { status: 'ok', statusCode };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Re-throw for timeout handling
    }

    // For HEAD requests, return null to trigger GET fallback
    if (method === 'HEAD') {
      return null;
    }

    throw error;
  }
}

/**
 * Check multiple links (with concurrency limit)
 */
export async function checkLinks(
  urls: string[],
  concurrency = 5
): Promise<Map<string, LinkCheckResult>> {
  const results = new Map<string, LinkCheckResult>();
  const queue = [...urls];
  const pending: Promise<void>[] = [];

  const processNext = async () => {
    while (queue.length > 0) {
      const url = queue.shift()!;
      const result = await checkLink(url);
      results.set(url, result);
    }
  };

  // Start concurrent workers
  for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
    pending.push(processNext());
  }

  await Promise.all(pending);
  return results;
}
