import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard, softDeleteCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const card = await getCard(user.id, params.id);
    if (!card) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;

    // Conflict detection: Check if client has stale version
    const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
    if (ifUnmodifiedSince) {
      const currentCard = await getCard(user.id, params.id);
      if (currentCard) {
        const clientTimestamp = new Date(ifUnmodifiedSince).getTime();
        const serverTimestamp = new Date(currentCard.updatedAt).getTime();

        // If server version is newer, reject the update (conflict detected)
        if (serverTimestamp > clientTimestamp) {
          return NextResponse.json(
            {
              error: "Conflict",
              message: "Card was modified by another device. Please refresh and try again.",
              serverCard: currentCard
            },
            { status: 409 } // 409 Conflict
          );
        }
      }
    }

    const body = await request.json();
    const card = await updateCard(user.id, params.id, body);
    return NextResponse.json(card);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    // Soft delete - move to trash
    await softDeleteCard(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
