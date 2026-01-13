/**
 * Metadata Extraction API
 * Fetches OpenGraph metadata for URLs with resilient fallbacks
 * Requires authentication to prevent abuse
 *
 * IMPORTANT: This API route MUST be used for metadata fetching because:
 * - Cross-origin sites (Reddit, Twitter, Instagram, etc.) don't have CORS headers
 * - Direct browser fetch() to these sites fails due to CORS policy
 * - This route runs on the server where CORS doesn't apply
 *
 * Used by:
 * - Browser extension
 * - Main app's metadata-service.ts (client-side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAuthUserFromRequest } from '@/lib/supabase/server';
import { fetchMetadata, validateUrl } from '@/lib/metadata';

// Force Node.js runtime for fetch
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Authentication required (supports both cookies and Bearer token)
    const user = await getAuthUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting: 30 requests per minute per user (authenticated users get higher limits)
    const identifier = `metadata:${user.id}`;
    const { success } = checkRateLimit(identifier, 60000, 30);

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

    // Validate URL (format, protocol, and SSRF protection)
    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid URL' },
        { status: 400 }
      );
    }

    // Use the new metadata fetcher with site-specific handlers
    // This handles YouTube, Reddit, TikTok, Amazon, and generic OG/Twitter/JSON-LD
    const metadata = await fetchMetadata(url);

    // Return full metadata including source and shouldPersistImage for the client
    return NextResponse.json({
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      images: metadata.images,
      favicon: metadata.favicon,
      domain: metadata.domain,
      source: metadata.source,
      shouldPersistImage: metadata.shouldPersistImage,
    });
  } catch (error) {
    console.error('[Metadata API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
