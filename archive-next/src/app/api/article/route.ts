/**
 * Article Extraction API
 * Extracts clean article content from URLs for reader mode
 * Requires authentication to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { extractArticle } from '@/lib/services/article-extractor';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for JSDOM
export const runtime = 'nodejs';

/**
 * Check if extracted content is garbage (JS placeholders, nav-heavy, etc.)
 * Returns true if content should be rejected
 */
function isGarbageContent(content: string | null | undefined, textContent: string | null | undefined): boolean {
  if (!content && !textContent) return true;

  const text = textContent || content || '';
  const html = content || '';

  // Count garbage patterns
  const loadingCount = (text.match(/loading\.\.\./gi) || []).length;
  const skipToCount = (text.match(/skip to (main content|footer|navigation)/gi) || []).length;

  // Too many "Loading..." placeholders (JS-rendered content not loaded)
  if (loadingCount >= 3) {
    console.log('[Article API] Rejected: too many Loading... placeholders');
    return true;
  }

  // Content is mostly navigation links
  if (skipToCount >= 2 && text.length < 500) {
    console.log('[Article API] Rejected: mostly navigation content');
    return true;
  }

  // Count links vs text ratio (garbage content has many short links)
  const linkCount = (html.match(/<a\s/gi) || []).length;
  const wordCount = text.split(/\s+/).filter(w => w.length > 2).length;

  // More than 1 link per 5 words is suspicious for short content
  if (wordCount < 100 && linkCount > wordCount / 3) {
    console.log('[Article API] Rejected: too link-heavy for content length');
    return true;
  }

  return false;
}

/**
 * Check if hostname is a private/internal IP address
 * Prevents SSRF attacks
 */
function isPrivateIP(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();

  const BLOCKED_HOSTNAMES = ['localhost', 'localhost.localdomain', 'local', 'internal'];
  if (BLOCKED_HOSTNAMES.some(h => lowerHost === h || lowerHost.endsWith('.' + h))) {
    return true;
  }

  const BLOCKED_PATTERNS = [
    '127.', '0.0.0.0', '0.', '10.',
    '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.',
    '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.',
    '172.28.', '172.29.', '172.30.', '172.31.',
    '192.168.', '169.254.', '224.', '239.',
    '[::1]', '[::',  '[0:', '[fe80:', '[fc00:', '[fd',
    'fe80:', 'fc00:', 'fd00:', '::1',
  ];

  return BLOCKED_PATTERNS.some(pattern => lowerHost.startsWith(pattern));
}

export async function POST(request: NextRequest) {
  try {
    // Authentication required
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting: 30 requests per minute per user
    const identifier = `article:${user.id}`;
    const { success, remaining } = checkRateLimit(identifier, 60000, 30);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': '0' },
        }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format and SSRF protection
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // SSRF Protection
    if (isPrivateIP(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Cannot fetch private/internal URLs' },
        { status: 400 }
      );
    }

    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP(S) URLs allowed' },
        { status: 400 }
      );
    }

    // Extract article content (removed isArticleUrl check - let extraction decide)
    const result = await extractArticle(url);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to extract article' },
        { status: 422 }
      );
    }

    // Validate content quality - reject garbage extractions
    if (isGarbageContent(result.article?.content, result.article?.textContent)) {
      return NextResponse.json(
        { error: 'Content quality too low (JS-rendered or navigation-heavy page)' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      article: result.article,
    }, {
      headers: { 'X-RateLimit-Remaining': remaining.toString() },
    });
  } catch (error) {
    console.error('[Article API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for simple extraction via query param
 * Useful for testing: /api/article?url=https://example.com/article
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL query parameter is required' },
      { status: 400 }
    );
  }

  // Forward to POST handler
  const fakeRequest = {
    ...request,
    json: async () => ({ url }),
  } as NextRequest;

  return POST(fakeRequest);
}
