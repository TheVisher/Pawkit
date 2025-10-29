import { NextRequest, NextResponse } from "next/server";
import { fetchAndUpdateCardMetadata, getCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, notFound, validationError, success } from "@/lib/utils/api-responses";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    // Verify card belongs to user
    const existingCard = await getCard(user.id, id);
    if (!existingCard) {
      return notFound('Card');
    }

    const body = await request.json();
    const { url, previewServiceUrl } = body;

    if (!url) {
      return validationError('URL is required');
    }

    const card = await fetchAndUpdateCardMetadata(id, url, previewServiceUrl);
    return success(card);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/fetch-metadata', userId: user?.id });
  }
}
