import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard, softDeleteCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, segmentData: RouteParams) {
  try {
    const params = await segmentData.params;
    const card = await getCard(params.id);
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
    const params = await segmentData.params;
    const body = await request.json();
    const card = await updateCard(params.id, body);
    return NextResponse.json(card);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  try {
    const params = await segmentData.params;
    // Soft delete - move to trash
    await softDeleteCard(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
