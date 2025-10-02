import { NextRequest, NextResponse } from "next/server";
import { deleteCollection, updateCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  try {
    const params = await segmentData.params;
    const body = await request.json();
    const collection = await updateCollection(params.id, body);
    return NextResponse.json(collection);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  try {
    const params = await segmentData.params;
    await deleteCollection(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
