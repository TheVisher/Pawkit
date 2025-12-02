import { NextRequest, NextResponse } from "next/server";
import { exportData, importData } from "@/lib/server/import";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const includeDen = searchParams.get('includeDen') === 'true';

    const data = await exportData(user.id, includeDen);
    return success(data);
  } catch (error) {
    return handleApiError(error, { route: '/api/import', userId: user?.id });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 5 imports per hour per user (heavy operation)
    const rateLimitResult = rateLimit({
      identifier: `import:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many import requests. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const body = await request.json();
    const result = await importData(user.id, body);
    return success(result);
  } catch (error) {
    return handleApiError(error, { route: '/api/import', userId: user?.id });
  }
}
