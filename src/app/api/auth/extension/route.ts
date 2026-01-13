/**
 * Extension Auth API
 *
 * GET /api/auth/extension - Returns session tokens for browser extension
 *
 * This endpoint is called by the extension's content script (which runs on getpawkit.com)
 * to get the current session tokens. The content script can access cookies, so this
 * endpoint will return the session if the user is authenticated.
 *
 * SECURITY: Only returns access tokens (not refresh tokens) and validates extension origin.
 * The extension should use the POST /refresh endpoint when the access token expires.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Get trusted extension IDs from environment variable
 */
function getTrustedExtensionIds(): string[] {
  const ids = process.env.TRUSTED_EXTENSION_IDS;
  if (!ids) return [];
  return ids.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Validate that request comes from a trusted browser extension
 */
function validateExtensionOrigin(origin: string | null): boolean {
  if (!origin) return false;

  // Extract extension ID from origin
  const chromeMatch = origin.match(/^chrome-extension:\/\/([a-z]+)$/i);
  const firefoxMatch = origin.match(/^moz-extension:\/\/([a-f0-9-]+)$/i);
  const safariMatch = origin.match(/^safari-extension:\/\/([a-zA-Z0-9.-]+)$/i);

  const extensionId = chromeMatch?.[1] || firefoxMatch?.[1] || safariMatch?.[1];
  if (!extensionId) return false;

  const trustedIds = getTrustedExtensionIds();
  if (trustedIds.length === 0) {
    console.warn('[Auth/Extension] No TRUSTED_EXTENSION_IDS configured');
    return false;
  }

  return trustedIds.includes(extensionId);
}

export async function GET(_request: Request) {
  try {
    // Validate extension origin
    const headersList = await headers();
    const origin = headersList.get('origin');

    if (!validateExtensionOrigin(origin)) {
      console.warn('[Auth/Extension] Unauthorized origin attempted access:', origin);
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }

    // Get the current session from cookies
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Not authenticated', authenticated: false },
        { status: 401 }
      );
    }

    // Return only access token (NOT refresh token) for extension storage
    // The extension should use the POST /refresh endpoint when token expires
    // This limits the damage if the access token is compromised
    return NextResponse.json({
      authenticated: true,
      session: {
        access_token: session.access_token,
        // Deliberately NOT exposing refresh_token via API
        expires_at: session.expires_at,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
      },
    });
  } catch (error) {
    console.error('[Auth/Extension] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/extension/refresh - Refresh expired tokens
 *
 * Called by the extension when the access token expires.
 * The extension should use the server-side session for refresh.
 *
 * SECURITY: Validates extension origin and uses server session for refresh.
 */
export async function POST(_request: Request) {
  try {
    // Validate extension origin
    const headersList = await headers();
    const origin = headersList.get('origin');

    if (!validateExtensionOrigin(origin)) {
      console.warn('[Auth/Extension] Unauthorized refresh attempt from origin:', origin);
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }

    // Use server-side session refresh instead of accepting refresh_token in body
    // This is more secure as we use the httpOnly cookie session
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.', authenticated: false },
        { status: 401 }
      );
    }

    // Return refreshed access token (NOT refresh token)
    return NextResponse.json({
      authenticated: true,
      session: {
        access_token: session.access_token,
        // Deliberately NOT exposing refresh_token via API
        expires_at: session.expires_at,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
      },
    });
  } catch (error) {
    console.error('[Auth/Extension] Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
