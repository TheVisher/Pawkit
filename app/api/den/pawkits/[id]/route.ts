import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";

// DELETE /api/den/pawkits/[id] - Soft delete a Den Pawkit
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const { searchParams } = new URL(request.url);
    const deleteCards = searchParams.get("deleteCards") === "true";

    console.log('[DELETE Den Pawkit] ID:', params.id, 'DeleteCards:', deleteCards);

    // Verify the collection exists and belongs to the user
    const collection = await prisma.collection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        inDen: true,
        deleted: false,
      },
    });

    if (!collection) {
      console.log('[DELETE Den Pawkit] Not found');
      return NextResponse.json(
        { error: "Den Pawkit not found" },
        { status: 404 }
      );
    }

    console.log('[DELETE Den Pawkit] Found collection:', collection.name);

    // Soft delete the collection
    await prisma.collection.update({
      where: { id: params.id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    console.log('[DELETE Den Pawkit] Collection deleted');

    // If deleteCards is true, also soft delete all cards in this collection
    if (deleteCards && collection.slug) {
      // Use raw SQL to find cards with this collection slug in the JSON array
      const cardsToDelete = await prisma.$queryRaw`
        SELECT id FROM "Card"
        WHERE "userId" = ${user.id}
          AND deleted = false
          AND collections::jsonb ? ${collection.slug}
      `;

      const cardIds = (cardsToDelete as any[]).map(c => c.id);

      // Soft delete those cards
      if (cardIds.length > 0) {
        await prisma.card.updateMany({
          where: {
            id: { in: cardIds },
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
