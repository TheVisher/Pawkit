/**
 * Article Extraction API
 * Extracts clean article content from URLs for reader mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { extractArticle } from '@/lib/services/article-extractor';

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

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute (matching V1)
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success, remaining } = checkRateLimit(identifier, 60000, 20);

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

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
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
