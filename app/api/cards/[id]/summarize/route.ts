import { NextRequest } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { isYouTubeUrl } from "@/lib/utils/youtube";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

/**
 * Fetch YouTube transcript from the Railway transcript service
 */
async function fetchYouTubeContent(url: string): Promise<string | null> {
  const TRANSCRIPT_SERVICE = process.env.TRANSCRIPT_SERVICE_URL || 'https://web-production-8e544.up.railway.app';

  try {
    console.log('[YouTube] Fetching transcript from service...');

    const response = await fetch(
      `${TRANSCRIPT_SERVICE}/transcript?url=${encodeURIComponent(url)}`,
      {
        signal: AbortSignal.timeout(30000),  // 30s timeout - yt-dlp can be slow first time
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log('[YouTube] Service error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('[YouTube] Got transcript:', data.transcript?.length || 0, 'chars from:', data.title);

    return data.transcript;
  } catch (error) {
    console.error('[YouTube] Transcript service error:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 10 summarizations per minute per user (expensive operation)
    const rateLimitResult = rateLimit({
      identifier: `summarize:${user.id}`,
      limit: 10,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many summarization requests. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const { id } = await params;

    // Get the card
    const card = await prisma.card.findFirst({
      where: { id, userId: user.id }
    });

    if (!card) {
      return notFound('Card');
    }

    // Check if this is a YouTube URL
    if (!isYouTubeUrl(card.url)) {
      return success({
        success: false,
        error: 'Not a YouTube URL',
        message: 'Summarization is currently only supported for YouTube videos'
      });
    }

    // Fetch the transcript
    const transcript = await fetchYouTubeContent(card.url);

    if (!transcript) {
      return success({
        success: false,
        error: 'Transcript not available',
        message: 'Could not fetch transcript for this video. The video may not have captions available.'
      });
    }

    return success({
      success: true,
      transcript,
      url: card.url,
      title: card.title
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/summarize', userId: user?.id });
  }
}
