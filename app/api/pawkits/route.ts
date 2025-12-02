import { NextRequest, NextResponse } from "next/server";
import { createCollection, listCollections } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success, created, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Allow sync service to request deleted collections for proper sync state
    const searchParams = request.nextUrl.searchParams;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const result = await listCollections(user.id, includeDeleted);
    return success(result);
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits', userId: user?.id });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 30 pawkit creations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `pawkit-create:${user.id}`,
      limit: 30,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many pawkit creations. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const body = await request.json();
    const collection = await createCollection(user.id, body);
    return created(collection);
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits', userId: user?.id });
  }
}
