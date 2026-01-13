/**
 * OAuth Callback Route
 * Exchanges auth code for session and redirects to dashboard
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Whitelist of allowed redirect paths after OAuth
const ALLOWED_PATHS = ['/dashboard', '/library', '/home', '/calendar', '/notes', '/favorites'];

function getSafeRedirectPath(requestedPath: string | null): string {
  if (!requestedPath) return '/dashboard';

  // Check if path is in whitelist
  if (ALLOWED_PATHS.includes(requestedPath)) {
    return requestedPath;
  }

  // Default to dashboard for any non-whitelisted path
  return '/dashboard';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const safePath = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth - redirect to dashboard or specified route
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
