import { NextRequest, NextResponse } from "next/server";
import { permanentlyDeleteCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  try {
    const params = await segmentData.params;
    await permanentlyDeleteCollection(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
