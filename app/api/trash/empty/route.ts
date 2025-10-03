import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST() {
  try {
    await prisma.$transaction([
      prisma.card.deleteMany({
        where: { deleted: true }
      }),
      prisma.collection.deleteMany({
        where: { deleted: true }
      })
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
