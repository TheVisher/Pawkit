import { NextRequest } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, success } from "@/lib/utils/api-responses";
import { isYouTubeUrl } from "@/lib/utils/youtube";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

const TRANSCRIPT_SERVICE = process.env.TRANSCRIPT_SERVICE_URL || 'https://web-production-8e544.up.railway.app';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    const card = await prisma.card.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        url: true,
        title: true,
        summary: true,
        transcriptSegments: true,
        articleContent: true
      }
    });

    if (!card) {
      return notFound('Card');
    }

    // Check if this is a YouTube URL
    if (!isYouTubeUrl(card.url)) {
      return success({
        segments: [],
        summary: card.summary,
        error: 'Not a YouTube URL'
      });
    }

    // Check if we already have segments cached
    if (card.transcriptSegments) {
      try {
        const segments = JSON.parse(card.transcriptSegments) as TranscriptSegment[];
        return success({
          segments,
          summary: card.summary,
          cached: true
        });
      } catch {
        // If parsing fails, fetch fresh
      }
    }

    // Fetch from Railway service
    if (!card.url) {
      return success({ segments: [], summary: card.summary, error: 'No URL' });
    }

    console.log('[Transcript] Fetching from Railway service for:', card.url);

    const response = await fetch(
      `${TRANSCRIPT_SERVICE}/transcript?url=${encodeURIComponent(card.url)}`,
      {
        signal: AbortSignal.timeout(30000),
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log('[Transcript] Service error:', response.status, error);
      return success({
        segments: [],
        summary: card.summary,
        error: error.error || 'Transcript fetch failed'
      });
    }

    const data = await response.json();
    const segments = (data.segments || []) as TranscriptSegment[];

    console.log('[Transcript] Got', segments.length, 'segments from Railway');

    // Cache the segments if we got any
    if (segments.length > 0) {
      try {
        await prisma.card.update({
          where: { id, userId: user.id },
          data: {
            transcriptSegments: JSON.stringify(segments),
            // Also save flat transcript as articleContent if not already set
            ...(card.articleContent ? {} : { articleContent: data.transcript?.slice(0, 50000) })
          }
        });
      } catch (err) {
        // Log but don't fail if caching fails
        console.error('[Transcript] Failed to cache segments:', err);
      }
    }

    return success({
      segments,
      summary: card.summary,
      title: data.title,
      duration: data.duration,
      cached: false
    });

  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/transcript', userId: user?.id });
  }
}
