import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";

type DebugCard = {
  id: string;
  title: string | null;
  inDen: boolean;
  deleted: boolean;
  url: string;
};

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Get ALL cards including Den items
    const allCards: DebugCard[] = await prisma.card.findMany({
      where: {
        userId: user.id,
        deleted: false
      },
      select: {
        id: true,
        title: true,
        inDen: true,
        deleted: true,
        url: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 20
    }) as any;

    const denCards = allCards.filter((c: DebugCard) => c.inDen);
    const regularCards = allCards.filter((c: DebugCard) => !c.inDen);

    return success({
      total: allCards.length,
      denCount: denCards.length,
      regularCount: regularCards.length,
      denCards,
      regularCards
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/debug/cards', userId: user?.id });
  }
}
