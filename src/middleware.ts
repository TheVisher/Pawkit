/**
 * Next.js Middleware
 * Handles CORS for browser extension requests
 *
 * Authentication is handled by Convex client-side.
 * This middleware focuses on extension request handling only.
 */

import { type NextRequest, NextResponse } from 'next/server';

/**
 * Get trusted extension IDs from environment variable
 * Format: comma-separated list of extension IDs
 * Example: TRUSTED_EXTENSION_IDS=abcdef123456,xyz789012345
 */
function getTrustedExtensionIds(): string[] {
  const ids = process.env.TRUSTED_EXTENSION_IDS;
  if (!ids) return [];
  return ids.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Check if origin is a trusted browser extension
 * Validates against whitelist of known extension IDs
 */
function isTrustedExtensionOrigin(origin: string | null): boolean {
  if (!origin) return false;

  // Extract extension ID from origin
  // Chrome: chrome-extension://[extension-id]
  // Firefox: moz-extension://[extension-id]
  // Safari: safari-extension://[extension-id]
  const chromeMatch = origin.match(/^chrome-extension:\/\/([a-z]+)$/i);
  const firefoxMatch = origin.match(/^moz-extension:\/\/([a-f0-9-]+)$/i);
  const safariMatch = origin.match(/^safari-extension:\/\/([a-zA-Z0-9.-]+)$/i);

  const extensionId = chromeMatch?.[1] || firefoxMatch?.[1] || safariMatch?.[1];
  if (!extensionId) return false;

  const trustedIds = getTrustedExtensionIds();

  // If no trusted IDs are configured, reject all extension requests
  // This ensures security by default - extensions must be explicitly whitelisted
  if (trustedIds.length === 0) {
    console.warn('[Middleware] No TRUSTED_EXTENSION_IDS configured. Rejecting extension request from:', origin);
    return false;
  }

  return trustedIds.includes(extensionId);
}

/**
 * Add CORS headers for extension requests
 */
function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Handle CORS preflight for API routes from trusted extensions only
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/') && isTrustedExtensionOrigin(origin)) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response, origin!);
  }

  const response = NextResponse.next();

  // Add CORS headers for trusted extension requests to API routes
  if (pathname.startsWith('/api/') && isTrustedExtensionOrigin(origin)) {
    return addCorsHeaders(response, origin!);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
