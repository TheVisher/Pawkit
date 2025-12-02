import { NextRequest, NextResponse } from "next/server";
import { deleteCollection, updateCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 60 pawkit updates per minute per user
    const rateLimitResult = rateLimit({
      identifier: `pawkit-update:${user.id}`,
      limit: 60,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many pawkit updates. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const params = await segmentData.params;
    const body = await request.json();
    const collection = await updateCollection(user.id, params.id, body);
    return success(collection);
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits/[id]', userId: user?.id });
  }
}

export async function DELETE(request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 60 pawkit deletions per minute per user
    const rateLimitResult = rateLimit({
      identifier: `pawkit-delete:${user.id}`,
      limit: 60,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many pawkit deletions. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const params = await segmentData.params;
    const { searchParams } = new URL(request.url);
    const deleteCards = searchParams.get('deleteCards') === 'true';
    const deleteSubPawkits = searchParams.get('deleteSubPawkits') === 'true';

    await deleteCollection(user.id, params.id, deleteCards, deleteSubPawkits);
    return success({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits/[id]', userId: user?.id });
  }
}
