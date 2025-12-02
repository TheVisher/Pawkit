import { NextRequest, NextResponse } from "next/server";
import { fetchAndUpdateCardMetadata, getCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, notFound, validationError, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

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

    // Rate limiting: 30 metadata fetches per minute per user
    const rateLimitResult = rateLimit({
      identifier: `fetch-metadata:${user.id}`,
      limit: 30,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many metadata fetch requests. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const { id } = await params;

    // Verify card belongs to user
    const existingCard = await getCard(user.id, id);
    if (!existingCard) {
      return notFound('Card');
    }

    const body = await request.json();
    const { url, previewServiceUrl } = body;

    if (!url) {
      return validationError('URL is required');
    }

    const card = await fetchAndUpdateCardMetadata(id, url, previewServiceUrl);
    return success(card);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/fetch-metadata', userId: user?.id });
  }
}
