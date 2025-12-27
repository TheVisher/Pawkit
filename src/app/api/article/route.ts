/**
 * Article Extraction API
 * Extracts clean article content from URLs for reader mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { extractArticle, isArticleUrl } from '@/lib/services/article-extractor';

// Force Node.js runtime for JSDOM
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 requests per minute (article extraction is expensive)
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success, remaining } = checkRateLimit(identifier, 60000, 3);

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

    // Check if URL is likely to have article content
    if (!isArticleUrl(url)) {
      return NextResponse.json(
        { error: 'URL does not appear to be an article' },
        { status: 400 }
      );
    }

    // Extract article content
    const result = await extractArticle(url);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to extract article' },
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
