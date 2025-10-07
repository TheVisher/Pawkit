import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import type { CardDTO } from "@/lib/server/cards";
import type { Card } from "@prisma/client";

function mapCard(card: Card): CardDTO {
  return {
    ...card,
    type: card.type as any,
    status: card.status as any,
    tags: parseJsonArray(card.tags),
    collections: parseJsonArray(card.collections),
    metadata: parseJsonObject(card.metadata),
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    deletedAt: card.deletedAt?.toISOString() ?? null
  };
}

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

    return NextResponse.json({ items: denCards.map(mapCard) });
  } catch (error) {
    return handleApiError(error);
  }
}
