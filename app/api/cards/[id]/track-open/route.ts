import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, validationError, success } from "@/lib/utils/api-responses";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

/**
 * POST /api/cards/[id]/track-open
 * Track when a card is opened
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    // Authenticate user
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await context.params;
    const cardId = params.id;
    const { accessType = 'modal' } = await req.json();

    // Validate accessType
    if (!['modal', 'external', 'rediscover'].includes(accessType)) {
      return validationError("Invalid access type");
    }

    // Verify card belongs to user
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId: user.id,
      },
    });

    if (!card) {
      return notFound('Card');
    }

    // Update card tracking fields
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        lastOpenedAt: new Date(),
        openCount: {
          increment: 1,
        },
        lastAccessType: accessType,
      },
    });

    return success({
      lastOpenedAt: updatedCard.lastOpenedAt,
      openCount: updatedCard.openCount,
      lastAccessType: updatedCard.lastAccessType,
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/track-open', userId: user?.id });
  }
}
