/**
 * Extension Auth API
 *
 * GET /api/auth/extension - Returns session tokens for browser extension
 *
 * This endpoint is called by the extension's content script (which runs on getpawkit.com)
 * to get the current session tokens. The content script can access cookies, so this
 * endpoint will return the session if the user is authenticated.
 *
 * The extension stores these tokens and uses them for direct API calls,
 * eliminating the need for the content script bridge pattern.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get the current session from cookies
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Not authenticated', authenticated: false },
        { status: 401 }
      );
    }

    // Return session tokens for extension storage
    // The extension will store these and use them for direct API calls
    return NextResponse.json({
      authenticated: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
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
 * Uses the refresh token to get new access token.
 */
export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Create a Supabase client and refresh the session
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Token refresh failed', authenticated: false },
        { status: 401 }
      );
    }

    // Return new session tokens
    return NextResponse.json({
      authenticated: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
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
