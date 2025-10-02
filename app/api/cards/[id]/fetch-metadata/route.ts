import { NextRequest, NextResponse } from "next/server";
import { fetchAndUpdateCardMetadata } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
