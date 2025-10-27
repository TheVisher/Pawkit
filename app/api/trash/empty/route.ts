import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidateTag } from "next/cache";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Permanently delete all soft-deleted items in a transaction
    await prisma.$transaction([
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
