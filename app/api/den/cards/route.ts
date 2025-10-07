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

    console.log('[DenCardsAPI] Raw cards from DB:', denCards.map(c => ({ id: c.id, collections: c.collections, collectionsType: typeof c.collections })));

    // Parse collections field if it's a string
    const parsedCards = denCards.map(card => ({
      ...card,
      collections: typeof card.collections === 'string' ? JSON.parse(card.collections) : card.collections,
      tags: typeof card.tags === 'string' ? JSON.parse(card.tags) : card.tags
    }));

    console.log('[DenCardsAPI] Parsed cards:', parsedCards.map(c => ({ id: c.id, collections: c.collections })));

    return NextResponse.json({ items: parsedCards });
  } catch (error) {
    return handleApiError(error);
  }
}
