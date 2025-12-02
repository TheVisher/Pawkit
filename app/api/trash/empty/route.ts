import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidateTag } from "next/cache";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

export async function POST() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 10 trash empty operations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `trash-empty:${user.id}`,
      limit: 10,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many trash operations. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    // Permanently delete all soft-deleted items in a transaction
    const result = await prisma.$transaction([
      prisma.card.deleteMany({
        where: { userId: user.id, deleted: true }
      }),
      prisma.collection.deleteMany({
        where: { userId: user.id, deleted: true }
      })
    ]);

    // Invalidate caches to prevent stale data
    revalidateTag('cards');
    revalidateTag('collections');

    const deletedCards = result[0].count;
    const deletedPawkits = result[1].count;

    return success({
      ok: true,
      message: `Trash emptied successfully: ${deletedCards} cards and ${deletedPawkits} pawkits permanently deleted`,
      deletedCards,
      deletedPawkits
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/trash/empty', userId: user?.id });
  }
}
