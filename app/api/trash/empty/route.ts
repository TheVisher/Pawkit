import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidateTag } from "next/cache";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function POST() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
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
