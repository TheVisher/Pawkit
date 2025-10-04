import { NextRequest, NextResponse } from "next/server";
import { fetchAndUpdateCardMetadata, getCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify card belongs to user
    const existingCard = await getCard(user.id, id);
    if (!existingCard) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { url, previewServiceUrl } = body;

    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    const card = await fetchAndUpdateCardMetadata(id, url, previewServiceUrl);
    return NextResponse.json(card);
  } catch (error) {
    return handleApiError(error);
  }
}
