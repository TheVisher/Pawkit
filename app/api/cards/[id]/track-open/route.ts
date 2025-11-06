import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/services/auth-service";
import { db } from "@/lib/services/db";

/**
 * POST /api/cards/[id]/track-open
 * Track when a card is opened
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const cardId = params.id;
    const { accessType = 'modal' } = await req.json();

    // Validate accessType
    if (!['modal', 'external', 'rediscover'].includes(accessType)) {
      return NextResponse.json(
        { error: "Invalid access type" },
        { status: 400 }
      );
    }

    // Verify card belongs to user
    const card = await db.card.findFirst({
      where: {
        id: cardId,
        userId: session.user.id,
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Update card tracking fields
    const updatedCard = await db.card.update({
      where: { id: cardId },
      data: {
        lastOpenedAt: new Date(),
        openCount: {
          increment: 1,
        },
        lastAccessType: accessType,
      },
    });

    return NextResponse.json({
      success: true,
      lastOpenedAt: updatedCard.lastOpenedAt,
      openCount: updatedCard.openCount,
      lastAccessType: updatedCard.lastAccessType,
    });
  } catch (error) {
    console.error("[track-open] Error tracking card open:", error);
    return NextResponse.json(
      { error: "Failed to track card open" },
      { status: 500 }
    );
  }
}
