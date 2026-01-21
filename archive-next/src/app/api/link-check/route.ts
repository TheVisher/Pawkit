/**
 * Link Check API
 * Checks if URLs are still valid and accessible
 *
 * SECURITY: Requires authentication to prevent SSRF abuse
 * Rate limiting is based on user ID, not IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkLink, checkLinks } from '@/lib/services/link-checker';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * POST - Check single URL or batch of URLs
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Rate limiting: 10 requests per minute, keyed by user ID (not IP)
    const { success, remaining } = checkRateLimit(`link-check:${user.id}`, 60000, 10);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

    const body = await request.json();
    const { url, urls } = body;

    // Single URL check
    if (url && typeof url === 'string') {
      const result = await checkLink(url);
      return NextResponse.json({
        url,
        ...result,
      }, {
        headers: { 'X-RateLimit-Remaining': remaining.toString() },
      });
    }

    // Batch URL check
    if (urls && Array.isArray(urls)) {
      // Limit batch size
      const MAX_BATCH = 20;
      const urlsToCheck = urls.slice(0, MAX_BATCH).filter(
        (u): u is string => typeof u === 'string'
      );

      if (urlsToCheck.length === 0) {
        return NextResponse.json(
          { error: 'No valid URLs provided' },
          { status: 400 }
        );
      }

      const results = await checkLinks(urlsToCheck);
      const response: Record<string, unknown> = {};

      for (const [checkUrl, result] of results) {
        response[checkUrl] = result;
      }

      return NextResponse.json({
        results: response,
        checked: urlsToCheck.length,
        truncated: urls.length > MAX_BATCH,
      }, {
        headers: { 'X-RateLimit-Remaining': remaining.toString() },
      });
    }

    return NextResponse.json(
      { error: 'Either url or urls parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Link Check API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Quick single URL check via query param
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate user first
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Authentication required.' },
      { status: 401 }
    );
  }

  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL query parameter is required' },
      { status: 400 }
    );
  }

  // 2. Rate limiting keyed by user ID
  const { success, remaining } = checkRateLimit(`link-check:${user.id}`, 60000, 10);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    );
  }

  // 3. Check the URL
  const result = await checkLink(url);
  return NextResponse.json({
    url,
    ...result,
  }, {
    headers: { 'X-RateLimit-Remaining': remaining.toString() },
  });
}
