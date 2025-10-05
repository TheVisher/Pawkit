import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all cards in The Den for this user
    const denCards = await prisma.card.findMany({
      where: {
        userId: user.id,
        inDen: true,
        deleted: false
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ items: denCards });
  } catch (error) {
    return handleApiError(error);
  }
}
