import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.card.deleteMany({
        where: { userId: user.id, deleted: true }
      }),
      prisma.collection.deleteMany({
        where: { userId: user.id, deleted: true }
      })
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
