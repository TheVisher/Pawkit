import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";

type DebugCard = {
  id: string;
  title: string | null;
  inDen: boolean;
  deleted: boolean;
  url: string;
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({
      total: allCards.length,
      denCount: denCards.length,
      regularCount: regularCards.length,
      denCards,
      regularCards
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
